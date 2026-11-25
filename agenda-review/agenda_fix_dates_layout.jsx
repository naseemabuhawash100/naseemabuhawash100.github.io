#target illustrator
// تصحيح ٢: بصفحات الشريط على الشمال بكانون الثاني (2..30 زوجي) ونيسان (92..120 زوجي)
// العربي يصير على الشمال والإنجليزي على اليمين زي باقي الأشهر،
// وتكبير مربع "Wednesday" المقطوع بالصفحات 6 و20 و41 و55.
// آمن إذا انشغل أكثر من مرة: بيحط كل نص بمكان ثابت.
(function () {
  if (!app.documents.length) { alert("افتح ملف الأجندة أولاً"); return; }
  var doc = app.activeDocument, abs = doc.artboards;
  if (abs.length != 181) { alert("الملف لازم يكون فيه 181 صفحة، والمفتوح فيه " + abs.length); return; }

  // أماكن الصفحات الصحيحة (آذار) بالنقاط من زاوية الصفحة: العربي من الشمال، الإنجليزي من اليمين
  var AR_LEFT = 162.0, EN_RIGHT = 439.4;
  var TOP = { wd: 47.3, greg: 73.1, hij: 92.2 };
  var WED_PAGES = { 6: 1, 20: 1, 41: 1, 55: 1 }, WED_WIDTH = 91.7;

  function target(p) {
    if (p % 2) return 0;
    if (p >= 2 && p <= 30) return 1;    // كانون الثاني: سطور التاريخ بس
    if (p >= 92 && p <= 120) return 2;  // نيسان: كل السطور
    return 0;
  }
  var rects = [];
  for (var a = 0; a < abs.length; a++) rects.push(abs[a].artboardRect);
  function pageOf(b) {
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) return i + 1;
    }
    return 0;
  }
  var AR_WD = /^(الاثنين|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد)$/;
  function role(s) {
    s = s.replace(/^\s+|\s+$/g, "");
    var lat = /[A-Za-z]/.test(s);
    if (/^[A-Za-z]+day$/.test(s)) return ["wd", "en"];
    if (AR_WD.test(s)) return ["wd", "ar"];
    if (/2027/.test(s) && s.length < 25) return ["greg", lat ? "en" : "ar"];
    if (/14[45]\d/.test(s) && s.length < 25) return ["hij", lat ? "en" : "ar"];
    return null;
  }

  // مرور واحد على النصوص، والحسابات الثقيلة بس للنصوص المرشحة
  var TF = doc.textFrames, jobs = [], wed = [];
  for (var i = 0; i < TF.length; i++) {
    var tf = TF[i], s = tf.contents, r = role(s);
    if (!r) continue;
    var p = pageOf(tf.geometricBounds);
    if (r[0] == "wd" && r[1] == "en" && WED_PAGES[p] && s.replace(/\s/g, "") == "Wednesday") wed.push(tf);
    var t = target(p);
    if (t == 2 || (t == 1 && r[0] != "wd")) jobs.push([tf, p, r[0], r[1]]);
  }

  var widened = 0;
  for (i = 0; i < wed.length; i++) {
    var w = wed[i];
    if (w.kind != TextType.AREATEXT) continue;
    var b0 = w.geometricBounds;
    if (b0[2] - b0[0] >= WED_WIDTH) continue;
    try {
      var keepRight = String(w.textRange.paragraphAttributes.justification).indexOf("RIGHT") >= 0;
      w.textPath.width = WED_WIDTH;
      var b1 = w.geometricBounds;
      w.translate(keepRight ? b0[2] - b1[2] : b0[0] - b1[0], b0[1] - b1[1]);
      widened++;
    } catch (e) {}
  }

  var moved = 0, pages = {};
  for (i = 0; i < jobs.length; i++) {
    var j = jobs[i], f = j[0], rect = rects[j[1] - 1];
    f.textRange.paragraphAttributes.justification =
      j[3] == "ar" ? Justification.FULLJUSTIFYLASTLINELEFT : Justification.FULLJUSTIFYLASTLINERIGHT;
    if (j[2] == "wd" && j[3] == "en") f.textRange.characterAttributes.size = 12; // صفحة 120 كانت 13
    var b = f.geometricBounds;
    var dx = j[3] == "ar" ? (rect[0] + AR_LEFT) - b[0] : (rect[0] + EN_RIGHT) - b[2];
    var dy = (rect[1] - TOP[j[2]]) - b[1];
    f.translate(dx, dy);
    moved++; pages[j[1]] = 1;
  }
  var n = 0; for (var k in pages) n++;

  alert("خلص ✔\nتم ترتيب " + moved + " سطر بـ " + n + " صفحة (المتوقع 150 سطر بـ 30 صفحة)" +
        "\nتم تكبير " + widened + " مربع Wednesday (المتوقع 4)");
})();
