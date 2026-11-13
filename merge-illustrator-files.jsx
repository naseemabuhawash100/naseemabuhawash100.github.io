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
    var EDGE_GAP_PT = 200;  // المسافة بين الصفحات الموجودة والصفحات المضافة (نقاط فعلية)
    var PAGE_GAP_PT = 40;   // المسافة بين الصفحات المضافة نفسها
    var MARGIN = 2;         // هامش أمان من حافة مساحة العمل (بوحدات المستند)

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
    var progress = null;
    try {
        run(f1, f2, out);
    } catch (e) {
        if (progress) progress.close();
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

        if (n1 + n2 + (targetIsSecond ? nDstOriginal : 0) > MAX_ARTBOARDS) {
            alert("مجموع الصفحات أكبر من الحد المسموح في Illustrator (" + MAX_ARTBOARDS + ").");
            return;
        }

        var ratio = scaleOf(src) / scaleOf(dst);
        progress = makeProgress("تحليل الصفحات...");

        var items = collectItems(src);
        var clusters = buildClusters(src, items, ratio, progress);

        dst.activate();
        progress.label("قياس مساحة العمل...");
        var C = canvasBounds(dst);
        var D = docBounds(dst);
        var placed = packClusters(clusters, C, D,
                                  EDGE_GAP_PT / scaleOf(dst), PAGE_GAP_PT / scaleOf(dst));
        if (!placed) {
            progress.close(); progress = null;
            var big = 0;
            for (var b = 0; b < clusters.length; b++) big = Math.max(big, clusters[b].w, clusters[b].h);
            alert("لا توجد مساحة فارغة كافية على مساحة العمل لإضافة صفحات الملف الآخر.\n" +
                  "الملفان الأصليان لم يتغيرا.\n\n" +
                  "معلومات للتشخيص:\n" +
                  "مقياس الملف الأول: " + scaleOf(d1) + "، الثاني: " + scaleOf(d2) + "\n" +
                  "مساحة العمل: " + fmt(C) + "\n" +
                  "الصفحات الموجودة: " + fmt(D) + "\n" +
                  "عدد المجموعات: " + clusters.length + "، أكبر بُعد: " + Math.round(big));
            return;
        }

        // كل التعديلات بعد هذا السطر تكون على الملف الجديد فقط.
        var opts = new IllustratorSaveOptions();
        opts.pdfCompatible = true;
        dst.saveAs(out, opts);

        progress.label("إضافة الصفحات...");
        for (var i = 0; i < src.artboards.length; i++) {
            var sa = src.artboards[i];
            var ab = dst.artboards.add(mapRect(sa.artboardRect, ratio, clusters.byArtboard[i].off));
            ab.name = sa.name;
        }

        var restore = [];
        var layerMap = mapLayers(src, dst, restore);
        var stats = { items: 0, rescaled: 0 };
        progress.reset("نسخ العناصر...", items.length);
        for (var k = 0; k < items.length; k++) {
            var it = items[k];
            var dup = it.item.duplicate(layerMap[it.layerKey], ElementPlacement.PLACEATEND);
            fitToMapped(dup, it.geo, ratio, it.cluster.off, stats);
            stats.items++;
            progress.step();
        }
        for (var r = restore.length - 1; r >= 0; r--) {
            restore[r].layer.locked = restore[r].locked;
            restore[r].layer.visible = restore[r].visible;
        }

        var orderNote = "";
        if (targetIsSecond) {
            // صفحات الملف الأول أُضيفت في آخر القائمة؛ ننقل صفحات الملف الثاني بعدها.
            progress.label("ترتيب الصفحات...");
            if (!moveFirstArtboardsToEnd(dst, nDstOriginal)) {
                orderNote = "\n\nتنبيه: لم أستطع إعادة ترتيب الصفحات تلقائياً. " +
                            "رتّبها من لوحة Artboards بسحب صفحات الملف الأول إلى الأعلى.";
            }
        }
        progress.close(); progress = null;

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

    // العناصر العليا في كل طبقة (والطبقات الفرعية) بترتيبها، مع حدودها.
    function collectItems(doc) {
        var list = [];
        (function walk(parent, key) {
            for (var i = 0; i < parent.layers.length; i++) {
                var l = parent.layers[i], lk = key + "/" + i;
                l.locked = false; l.visible = true; // المصدر يُغلق بدون حفظ
                for (var j = 0; j < l.pageItems.length; j++) {
                    var p = l.pageItems[j];
                    list.push({ item: p, layerKey: lk, geo: p.geometricBounds, vis: p.visibleBounds });
                }
                walk(l, lk);
            }
        })(doc, "");
        return list;
    }

    // كل صفحة مع عناصرها تُنقل كوحدة واحدة. الصفحات التي يربطها عنصر مشترك
    // (مثل مجموعة تمتد على عدة صفحات) تُنقل معاً حتى لا يتغير شيء في تصميمها.
    function buildClusters(doc, items, ratio, progress) {
        var n = doc.artboards.length, rects = [], parent = [], i;
        for (i = 0; i < n; i++) { rects.push(doc.artboards[i].artboardRect); parent.push(i); }
        function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }

        progress.reset("تحليل الصفحات...", items.length);
        var hitsOf = [];
        for (i = 0; i < items.length; i++) {
            var hits = [];
            for (var a = 0; a < n; a++) if (overlaps(items[i].vis, rects[a])) hits.push(a);
            for (var h = 1; h < hits.length; h++) parent[find(hits[h])] = find(hits[0]);
            hitsOf.push(hits);
            progress.step();
        }

        var byRoot = {}, list = [], byArtboard = [];
        for (i = 0; i < n; i++) {
            var root = find(i);
            if (!byRoot[root]) { byRoot[root] = { first: i, rect: null }; list.push(byRoot[root]); }
            byRoot[root].rect = union(byRoot[root].rect, rects[i]);
            byArtboard[i] = byRoot[root];
        }
        for (i = 0; i < items.length; i++) {
            var c;
            if (hitsOf[i].length) {
                c = byArtboard[find(hitsOf[i][0])];
            } else {
                // عنصر خارج كل الصفحات: يُنقل وحده
                c = { first: n + i, rect: null };
                list.push(c);
            }
            c.rect = union(c.rect, items[i].vis);
            items[i].cluster = c;
        }
        list.sort(function (x, y) { return x.first - y.first; });
        for (i = 0; i < list.length; i++) {
            list[i].w = (list[i].rect[2] - list[i].rect[0]) * ratio;
            list[i].h = (list[i].rect[1] - list[i].rect[3]) * ratio;
            list[i].ratio = ratio;
        }
        list.byArtboard = byArtboard;
        return list;
    }

    // يرص المجموعات صفوفاً في المناطق الفارغة حول الصفحات الموجودة، داخل حدود مساحة العمل.
    function packClusters(clusters, C, D, edgeGap, gap) {
        var strips = [
            [C[0], D[3] - edgeGap, C[2], C[3]],                 // تحت
            [C[0], C[1], C[2], D[1] + edgeGap],                 // فوق
            [D[2] + edgeGap, D[1], C[2], D[3]],                 // يمين
            [C[0], D[1], D[0] - edgeGap, D[3]]                  // يسار
        ];
        var s = 0, x, y, rowH;
        function startStrip() { x = strips[s][0]; y = strips[s][1]; rowH = 0; }
        startStrip();
        for (var i = 0; i < clusters.length; i++) {
            var c = clusters[i];
            while (true) {
                if (s >= strips.length) return false;
                var S = strips[s];
                if (x + c.w > S[2] && x > S[0]) { x = S[0]; y -= rowH + gap; rowH = 0; }
                if (x + c.w <= S[2] && y - c.h >= S[3]) break;
                s++;
                if (s < strips.length) startStrip();
            }
            c.off = [x - c.rect[0] * c.ratio, y - c.rect[1] * c.ratio];
            x += c.w + gap;
            rowH = Math.max(rowH, c.h);
        }
        return true;
    }

    // حدود مساحة العمل الفعلية، بتجربة إضافة صفحات صغيرة مؤقتة.
    function canvasBounds(doc) {
        var r0 = doc.artboards[0].artboardRect;
        var cx = (r0[0] + r0[2]) / 2, cy = (r0[1] + r0[3]) / 2;
        var FAR = 40000;
        var right = edge(cx, cx + FAR, function (v) { return probe(doc, v - 1, cy); });
        var left = edge(cx, cx - FAR, function (v) { return probe(doc, v, cy); });
        var top = edge(cy, cy + FAR, function (v) { return probe(doc, cx, v); });
        var bottom = edge(cy, cy - FAR, function (v) { return probe(doc, cx, v + 1); });
        return [left + MARGIN, top - MARGIN, right - MARGIN, bottom + MARGIN];
    }

    function edge(inside, outside, ok) {
        if (ok(outside)) return outside;
        for (var i = 0; i < 40 && Math.abs(outside - inside) > 0.5; i++) {
            var mid = (inside + outside) / 2;
            if (ok(mid)) inside = mid; else outside = mid;
        }
        return inside;
    }

    function probe(doc, x, y) {
        var n = doc.artboards.length, ok = false;
        try {
            var ab = doc.artboards.add([x, y, x + 1, y - 1]);
            var r = ab.artboardRect;
            ok = Math.abs(r[0] - x) < 0.01 && Math.abs(r[1] - y) < 0.01;
        } catch (e) { ok = false; }
        while (doc.artboards.length > n) doc.artboards.remove(doc.artboards.length - 1);
        return ok;
    }

    // ينشئ في الهدف طبقات مطابقة لطبقات المصدر (بالاسم) ويعيد خريطة مفتاح الطبقة -> طبقة الهدف.
    function mapLayers(src, dst, restore) {
        var map = {};
        (function walk(sp, dp, key) {
            for (var i = 0; i < sp.layers.length; i++) {
                var sl = sp.layers[i], lk = key + "/" + i;
                var dl = findOrAddLayer(dp, sl, restore);
                map[lk] = dl;
                walk(sl, dl, lk);
            }
        })(src, dst, "");
        return map;
    }

    // يضع العنصر المنسوخ بالمكان والحجم المطلوبين، أياً كان ما فعله Illustrator عند النسخ بين مستندين.
    function fitToMapped(dup, srcBounds, ratio, off, stats) {
        var want = mapRect(srcBounds, ratio, off);
        var have = dup.geometricBounds;
        var wantW = want[2] - want[0], wantH = want[1] - want[3];
        var haveW = have[2] - have[0], haveH = have[1] - have[3];
        var useW = Math.abs(wantW) >= Math.abs(wantH);
        var wantDim = useW ? wantW : wantH, haveDim = useW ? haveW : haveH;
        var wasLocked = dup.locked;
        if (wasLocked) dup.locked = false;
        if (haveDim > 1e-6 && wantDim > 1e-6) {
            var c = wantDim / haveDim;
            if (Math.abs(c - 1) > 1e-3) {
                dup.resize(c * 100, c * 100, true, true, true, true, c * 100, Transformation.TOPLEFT);
                stats.rescaled++;
                have = dup.geometricBounds;
            }
        }
        var dx = want[0] - have[0], dy = want[1] - have[1];
        if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) dup.translate(dx, dy);
        if (wasLocked) dup.locked = true;
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
            restore.push({ layer: dl, locked: false, visible: true });
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

    function overlaps(a, b) {
        return a[0] < b[2] && a[2] > b[0] && a[3] < b[1] && a[1] > b[3];
    }

    function union(a, b) {
        if (!a) return [b[0], b[1], b[2], b[3]];
        return [Math.min(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
    }

    function mapRect(r, ratio, off) {
        return [r[0] * ratio + off[0], r[1] * ratio + off[1], r[2] * ratio + off[0], r[3] * ratio + off[1]];
    }

    function fmt(r) {
        if (!r) return "-";
        return "[" + Math.round(r[0]) + ", " + Math.round(r[1]) + ", " + Math.round(r[2]) + ", " + Math.round(r[3]) + "]";
    }

    function fileFilter() {
        return $.os.indexOf("Windows") >= 0 ? "Illustrator:*.ai" : function (f) {
            return f instanceof Folder || /\.ai$/i.test(f.name);
        };
    }

    function makeProgress(title) {
        var w = new Window("palette", "دمج الملفين");
        var label = w.add("statictext", undefined, title);
        label.preferredSize.width = 320;
        var bar = w.add("progressbar", undefined, 0, 1);
        bar.preferredSize.width = 320;
        w.show();
        var done = 0, total = 1;
        return {
            reset: function (text, n) {
                label.text = text; total = Math.max(n, 1); done = 0;
                bar.maxvalue = total; bar.value = 0; w.update();
            },
            label: function (text) { label.text = text; w.update(); },
            step: function () {
                done++;
                if (done % 50 === 0 || done === total) { bar.value = done; w.update(); }
            },
            close: function () { w.close(); }
        };
    }
})();
