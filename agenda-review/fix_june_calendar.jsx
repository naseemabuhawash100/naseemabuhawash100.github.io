#target illustrator
// يصلّح آخر سطر بتقويم حزيران الصغير (26 27 28 29 30) بكل صفحات حزيران.
// شغّله بعد import_fixes.jsx وليس قبله، لأنه بيضيف ويحذف إطارات نص.
(function () {
  var doc = app.activeDocument, abs = doc.artboards;
  var FIRST = 152, LAST = 181; // صفحات حزيران
  function inBoard(b, r) {
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    return cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3];
  }
  function size(tf) { try { return tf.textRange.characterAttributes.size; } catch (e) { return 0; } }
  var fixed = 0, problems = [];
  for (var p = FIRST; p <= LAST; p++) {
    var r = abs[p - 1].artboardRect, cells = [], byNum = {};
    for (var i = 0; i < doc.textFrames.length; i++) {
      var tf = doc.textFrames[i], b = tf.geometricBounds;
      if (!inBoard(b, r)) continue;
      var s = tf.contents.replace(/\s/g, "");
      if (s === "" ? Math.abs(b[2] - b[0]) < 0.5 : (size(tf) == 6 && /^\d+$/.test(s))) {
        cells.push(tf);
        if (s !== "") byNum[s] = tf;
      }
    }
    if (!byNum["19"] || !byNum["23"] || !byNum["26"]) { problems.push(p); continue; }
    var rowTop = byNum["26"].geometricBounds[1];
    var dy = rowTop - byNum["19"].geometricBounds[1];
    for (var c = cells.length - 1; c >= 0; c--)
      if (Math.abs(cells[c].geometricBounds[1] - rowTop) < 3) cells[c].remove();
    for (var n = 19; n <= 23; n++) {
      var d = byNum[String(n)].duplicate();
      d.contents = String(n + 7);
      d.translate(0, dy);
    }
    fixed++;
  }
  alert("تم تصحيح تقويم " + fixed + " صفحة" + (problems.length ? "\nما قدرت أصلّح الصفحات: " + problems.join(", ") : ""));
})();
