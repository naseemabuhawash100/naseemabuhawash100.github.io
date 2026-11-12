#target illustrator
// لمسة أخيرة: اسم اليوم بالإنجليزي بصفحات الشريط الشمال ينتهي على نفس خط التواريخ تحته.
(function () {
  if (!app.documents.length) { alert("افتح ملف الأجندة أولاً"); return; }
  var doc = app.activeDocument, abs = doc.artboards, EN_RIGHT = 439.4;
  var rects = [], left = {};
  for (var a = 0; a < abs.length; a++) rects.push(abs[a].artboardRect);
  function pageOf(b) {
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) return i;
    }
    return -1;
  }
  var TF = doc.textFrames, wd = [];
  for (var i = 0; i < TF.length; i++) {
    var s = TF[i].contents.replace(/^\s+|\s+$/g, "");
    // الصفحة شمال إذا عنوان "الأهـــداف" بنصها الشمال
    if (s == "الأهـــداف") {
      var b = TF[i].geometricBounds, p = pageOf(b);
      if (p >= 0 && (b[0] + b[2]) / 2 - rects[p][0] < 240) left[p] = 1;
    } else if (/^[A-Za-z]+day$/.test(s)) wd.push(TF[i]);
  }
  var n = 0;
  for (i = 0; i < wd.length; i++) {
    var f = wd[i], p2 = pageOf(f.geometricBounds);
    if (!left[p2]) continue;
    f.textRange.paragraphAttributes.justification = Justification.FULLJUSTIFYLASTLINERIGHT;
    var bb = f.geometricBounds;
    f.translate(rects[p2][0] + EN_RIGHT - bb[2], 0);
    n++;
  }
  alert("خلص ✔ تم ترتيب " + n + " اسم يوم (المتوقع 89)");
})();
