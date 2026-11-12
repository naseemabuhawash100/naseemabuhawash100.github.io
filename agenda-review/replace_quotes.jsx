#target illustrator
// بيبدّل العبارة أسفل كل صفحة بعبارة من ملف نصي (كل عبارة بسطر، بنفس ترتيب الصفحات).
// التنسيق (الخط، الحجم، اللون) بيضل زي ما هو، وإذا العبارة طويلة بيصغّر الخط شوي لحد ما توسع.
(function () {
  if (!app.documents.length) { alert("افتح ملف الأجندة أولاً"); return; }
  var doc = app.activeDocument, abs = doc.artboards;

  var f = File.openDialog("اختار ملف العبارات (كل عبارة بسطر)", "*.txt");
  if (!f) return;
  f.encoding = "UTF-8"; f.open("r");
  var raw = f.read(); f.close();
  var lines = raw.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/), quotes = [];
  for (var i = 0; i < lines.length; i++) {
    var s = lines[i].replace(/^\s+|\s+$/g, "");
    if (s !== "") quotes.push(s);
  }

  var rects = [];
  for (var a = 0; a < abs.length; a++) rects.push(abs[a].artboardRect);
  function pageOf(b) {
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    for (var k = 0; k < rects.length; k++) {
      var r = rects[k];
      if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) return k;
    }
    return -1;
  }

  // العبارة الحالية بكل صفحة هي النص اللي بيبلش بـ «
  var byPage = [], TF = doc.textFrames;
  for (i = 0; i < TF.length; i++) {
    if (!/^\s*«/.test(TF[i].contents)) continue;
    var p = pageOf(TF[i].geometricBounds);
    if (p >= 0) byPage[p] = TF[i];
  }
  var frames = [], missing = [];
  for (p = 0; p < abs.length; p++) {
    if (byPage[p]) frames.push(byPage[p]); else missing.push(p + 1);
  }
  if (missing.length) alert("ما لقيت عبارة بالصفحات: " + missing.join(", ") + "\nرح أتخطاها.");

  if (quotes.length != frames.length &&
      !confirm("عدد العبارات بالملف " + quotes.length + " وعدد الصفحات " + frames.length +
               ".\nإذا كمّلت، رح أعبّي بالترتيب لحد ما يخلص الأقل. أكمّل؟")) return;

  function overflows(tf) {
    if (tf.kind != TextType.AREATEXT) return false;
    var shown = 0;
    for (var l = 0; l < tf.lines.length; l++) shown += tf.lines[l].characters.length;
    return shown < tf.characters.length;
  }

  var n = Math.min(quotes.length, frames.length), done = 0, shrunk = [], tooLong = [];
  for (i = 0; i < n; i++) {
    var tf = frames[i], q = quotes[i];
    if (!/^«/.test(q)) q = "« " + q + " »";
    var size = tf.textRange.characterAttributes.size, orig = size;
    tf.contents = q;
    tf.textRange.characterAttributes.size = size;
    while (overflows(tf) && size > orig * 0.75) {
      size = Math.round((size - orig * 0.05) * 100) / 100;
      tf.textRange.characterAttributes.size = size;
    }
    if (overflows(tf)) tooLong.push(pageOf(tf.geometricBounds) + 1);
    else if (size < orig) shrunk.push(pageOf(tf.geometricBounds) + 1);
    done++;
  }

  alert("خلص ✔\nتم تبديل " + done + " عبارة" +
        (shrunk.length ? "\nصغّرت الخط شوي بالصفحات: " + shrunk.join(", ") : "") +
        (tooLong.length ? "\n⚠ عبارات طويلة كتير وما وسعت، راجعها يدوياً بالصفحات: " + tooLong.join(", ") : ""));
})();
