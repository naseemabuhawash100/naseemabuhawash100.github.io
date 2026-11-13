//@target illustrator
/*
 * دمج ملفي Illustrator في ملف واحد قابل للتعديل.
 * صفحات (لوحات عمل) الملف الأول أولاً، ثم صفحات الملف الثاني بنفس ترتيبها.
 * الملفان الأصليان لا يُعدَّلان: النتيجة تُحفظ في ملف جديد تختاره.
 *
 * التشغيل: File > Scripts > Other Script... ثم اختر هذا الملف.
 */
(function () {
    var MAX_ARTBOARDS = 1000;
    var GAP_PT = 200; // المسافة بين صفحات الملفين على مساحة العمل (بالنقاط الفعلية)

    var f1 = File.openDialog("اختر الملف الأول (صفحاته تأتي أولاً)", fileFilter());
    if (!f1) return;
    var f2 = File.openDialog("اختر الملف الثاني (صفحاته تأتي بعد الأول)", fileFilter());
    if (!f2) return;
    if (f1.fsName === f2.fsName) { alert("اخترت نفس الملف مرتين."); return; }

    var out = File.saveDialog("احفظ الملف المدمج باسم جديد", fileFilter());
    if (!out) return;
    if (!/\.ai$/i.test(out.name)) out = new File(out.fsName + ".ai");
    if (out.fsName === f1.fsName || out.fsName === f2.fsName) {
        alert("اختر اسماً جديداً للملف المدمج حتى لا يُستبدل أحد الملفين الأصليين.");
        return;
    }

    var oldCoords = app.coordinateSystem;
    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    try {
        run(f1, f2, out);
    } catch (e) {
        alert("توقف الدمج بسبب خطأ:\n" + e + (e.line ? "\n(سطر " + e.line + ")" : "") +
              "\n\nالملفان الأصليان لم يتغيرا.");
    } finally {
        app.coordinateSystem = oldCoords;
    }

    function run(f1, f2, out) {
        var d1 = app.open(f1);
        var d2 = app.open(f2);
        var n1 = d1.artboards.length, n2 = d2.artboards.length;

        // الهدف هو المستند ذو مساحة العمل الأكبر (Large Canvas) حتى يتسع للصفحات كلها.
        var targetIsSecond = scaleOf(d2) > scaleOf(d1);
        var dst = targetIsSecond ? d2 : d1;
        var src = targetIsSecond ? d1 : d2;
        var nDstOriginal = dst.artboards.length;

        var needed = n1 + n2 + (targetIsSecond ? nDstOriginal : 0);
        if (needed > MAX_ARTBOARDS) {
            alert("مجموع الصفحات أكبر من الحد المسموح في Illustrator (" + MAX_ARTBOARDS + ").");
            return;
        }

        // احفظ نسخة جديدة فوراً، فكل التعديلات التالية تكون على الملف الجديد فقط.
        var opts = new IllustratorSaveOptions();
        opts.pdfCompatible = true;
        dst.saveAs(out, opts);

        var ratio = scaleOf(src) / scaleOf(dst);
        var gap = GAP_PT / scaleOf(dst);
        var S = docBounds(src);
        var D = docBounds(dst);

        var offset = placeArtboards(src, dst, ratio, S, D, gap);
        if (!offset) {
            alert("لا توجد مساحة كافية على مساحة العمل لإضافة صفحات الملف الآخر.\n" +
                  "الملفان الأصليان لم يتغيرا.");
            dst.close(SaveOptions.DONOTSAVECHANGES);
            return;
        }

        var progress = makeProgress(countTopItems(src));
        var restore = [];
        var stats = { items: 0, rescaled: 0 };
        copyLayers(src, dst, ratio, offset, restore, progress, stats);
        for (var r = 0; r < restore.length; r++) {
            restore[r].layer.locked = restore[r].locked;
            restore[r].layer.visible = restore[r].visible;
        }
        progress.close();

        var orderNote = "";
        if (targetIsSecond) {
            // صفحات الملف الأول أُضيفت في آخر القائمة؛ ننقل صفحات الملف الثاني بعدها.
            if (!moveFirstArtboardsToEnd(dst, nDstOriginal)) {
                orderNote = "\n\nتنبيه: لم أستطع إعادة ترتيب الصفحات تلقائياً. " +
                            "رتّبها من لوحة Artboards بسحب صفحات الملف الأول إلى الأعلى.";
            }
        }

        dst.save();
        src.close(SaveOptions.DONOTSAVECHANGES);
        dst.activate();

        alert("تم الدمج.\n" +
              "صفحات الملف الأول: " + n1 + "\n" +
              "صفحات الملف الثاني: " + n2 + "\n" +
              "مجموع الصفحات في الملف الجديد: " + dst.artboards.length + "\n" +
              "العناصر المنسوخة: " + stats.items +
              (stats.rescaled ? "\nعناصر عُدِّل مقياسها لتطابق الحجم الأصلي: " + stats.rescaled : "") +
              orderNote + "\n\nالملف: " + out.fsName);
    }

    // يضيف صفحات المستند المصدر إلى الهدف بنفس الترتيب والأسماء والمقاس الفعلي،
    // ويجرب أماكن حول الصفحات الموجودة حتى يجد مكاناً داخل مساحة العمل.
    function placeArtboards(src, dst, ratio, S, D, gap) {
        var candidates = [
            [D[0] - S[0] * ratio, (D[3] - gap) - S[1] * ratio],   // تحت
            [(D[2] + gap) - S[0] * ratio, D[1] - S[1] * ratio],   // يمين
            [D[0] - S[0] * ratio, (D[1] + gap) - S[3] * ratio],   // فوق
            [(D[0] - gap) - S[2] * ratio, D[1] - S[1] * ratio]    // يسار
        ];
        for (var c = 0; c < candidates.length; c++) {
            var off = candidates[c];
            if (!blockFits(dst, mapRect(S, ratio, off))) continue;
            var start = dst.artboards.length;
            try {
                for (var i = 0; i < src.artboards.length; i++) {
                    var sa = src.artboards[i];
                    var ab = dst.artboards.add(mapRect(sa.artboardRect, ratio, off));
                    ab.name = sa.name;
                }
                return off;
            } catch (e) {
                while (dst.artboards.length > start) dst.artboards.remove(dst.artboards.length - 1);
            }
        }
        return null;
    }

    // اختبار أن زوايا المنطقة كلها داخل مساحة العمل، بإضافة صفحات صغيرة مؤقتة عندها.
    function blockFits(doc, R) {
        var corners = [[R[0], R[1]], [R[2], R[1]], [R[0], R[3]], [R[2], R[3]]];
        var start = doc.artboards.length, ok = true;
        try {
            for (var i = 0; i < corners.length; i++) {
                var x = corners[i][0], y = corners[i][1];
                doc.artboards.add([x - 1, y + 1, x + 1, y - 1]);
            }
        } catch (e) { ok = false; }
        while (doc.artboards.length > start) doc.artboards.remove(doc.artboards.length - 1);
        return ok;
    }

    function copyLayers(srcParent, dstParent, ratio, off, restore, progress, stats) {
        for (var i = 0; i < srcParent.layers.length; i++) {
            var sl = srcParent.layers[i];
            sl.locked = false; sl.visible = true; // المصدر يُغلق بدون حفظ
            var dl = findOrAddLayer(dstParent, sl, restore);
            for (var j = 0; j < sl.pageItems.length; j++) {
                var item = sl.pageItems[j];
                var dup = item.duplicate(dl, ElementPlacement.PLACEATEND);
                fitToMapped(dup, item.geometricBounds, ratio, off, stats);
                stats.items++;
                progress.step();
            }
            copyLayers(sl, dl, ratio, off, restore, progress, stats);
        }
    }

    // يضع العنصر المنسوخ بالمكان والحجم المطلوبين، أياً كان ما فعله Illustrator عند النسخ بين مستندين.
    function fitToMapped(dup, srcBounds, ratio, off, stats) {
        var want = mapRect(srcBounds, ratio, off);
        var have = dup.geometricBounds;
        var wantW = want[2] - want[0], wantH = want[1] - want[3];
        var haveW = have[2] - have[0], haveH = have[1] - have[3];
        var useW = Math.abs(wantW) >= Math.abs(wantH);
        var wantDim = useW ? wantW : wantH, haveDim = useW ? haveW : haveH;
        if (haveDim > 1e-6 && wantDim > 1e-6) {
            var c = wantDim / haveDim;
            if (Math.abs(c - 1) > 1e-3) {
                var wasLocked = dup.locked;
                dup.locked = false;
                dup.resize(c * 100, c * 100, true, true, true, true, c * 100, Transformation.TOPLEFT);
                dup.locked = wasLocked;
                stats.rescaled++;
                have = dup.geometricBounds;
            }
        }
        var dx = want[0] - have[0], dy = want[1] - have[1];
        if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) {
            var wl = dup.locked;
            dup.locked = false;
            dup.translate(dx, dy);
            dup.locked = wl;
        }
    }

    function findOrAddLayer(dstParent, sl, restore) {
        var dl = null;
        for (var i = 0; i < dstParent.layers.length; i++) {
            if (dstParent.layers[i].name === sl.name) { dl = dstParent.layers[i]; break; }
        }
        if (!dl) {
            dl = dstParent.layers.add();
            dl.name = sl.name;
            try { dl.move(dstParent, ElementPlacement.PLACEATEND); } catch (e) {}
            try { dl.color = sl.color; } catch (e2) {}
            restore.push({ layer: dl, locked: sl.locked, visible: sl.visible });
        } else {
            restore.push({ layer: dl, locked: dl.locked, visible: dl.visible });
        }
        dl.locked = false;
        dl.visible = true;
        return dl;
    }

    function moveFirstArtboardsToEnd(doc, n) {
        var start = doc.artboards.length;
        try {
            for (var i = 0; i < n; i++) {
                var a = doc.artboards[i];
                var b = doc.artboards.add(a.artboardRect);
                b.name = a.name;
                try { b.rulerOrigin = a.rulerOrigin; } catch (e) {}
            }
        } catch (e2) {
            while (doc.artboards.length > start) doc.artboards.remove(doc.artboards.length - 1);
            return false;
        }
        for (var k = 0; k < n; k++) doc.artboards.remove(0);
        return true;
    }

    function countTopItems(parent) {
        var n = 0;
        for (var i = 0; i < parent.layers.length; i++) {
            n += parent.layers[i].pageItems.length + countTopItems(parent.layers[i]);
        }
        return n;
    }

    function scaleOf(doc) {
        try { var s = doc.scaleFactor; if (s > 0) return s; } catch (e) {}
        return 1;
    }

    function docBounds(doc) {
        var u = null;
        for (var i = 0; i < doc.artboards.length; i++) u = union(u, doc.artboards[i].artboardRect);
        try { if (doc.pageItems.length) u = union(u, doc.visibleBounds); } catch (e) {}
        return u;
    }

    function union(a, b) {
        if (!a) return [b[0], b[1], b[2], b[3]];
        return [Math.min(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
    }

    function mapRect(r, ratio, off) {
        return [r[0] * ratio + off[0], r[1] * ratio + off[1], r[2] * ratio + off[0], r[3] * ratio + off[1]];
    }

    function fileFilter() {
        return $.os.indexOf("Windows") >= 0 ? "Illustrator:*.ai" : function (f) {
            return f instanceof Folder || /\.ai$/i.test(f.name);
        };
    }

    function makeProgress(total) {
        var w = new Window("palette", "دمج الملفين...");
        var bar = w.add("progressbar", undefined, 0, Math.max(total, 1));
        bar.preferredSize.width = 320;
        var label = w.add("statictext", undefined, "0 / " + total);
        label.preferredSize.width = 320;
        w.show();
        var done = 0;
        return {
            step: function () {
                done++;
                if (done % 50 === 0 || done === total) {
                    bar.value = done;
                    label.text = done + " / " + total;
                    w.update();
                }
            },
            close: function () { w.close(); }
        };
    }
})();
