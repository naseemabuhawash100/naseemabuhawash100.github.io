#target illustrator
// فحص الأجندة: بيطلّع كل عنصر بكل صفحة (المكان، الحجم، الخط، اللون، المحاذاة، النص) لملف TSV.
// بيقرأ بس، ما بيغيّر شي بالملف.
(function () {
  if (!app.documents.length) { alert("افتح الملف أولاً"); return; }
  var doc = app.activeDocument, abs = doc.artboards;
  var f = File.saveDialog("حفظ ملف الفحص", "*.tsv");
  if (!f) return;

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
  function n(v) { return Math.round(v * 10) / 10; }
  function clean(s) { return String(s).replace(/\t/g, "\\t").replace(/[\r\n\u0003]/g, "\\n"); }
  function color(c) {
    try {
      if (c.typename == "RGBColor") return "RGB " + n(c.red) + "," + n(c.green) + "," + n(c.blue);
      if (c.typename == "CMYKColor") return "CMYK " + n(c.cyan) + "," + n(c.magenta) + "," + n(c.yellow) + "," + n(c.black);
      if (c.typename == "SpotColor") return "Spot " + c.spot.name;
      if (c.typename == "GrayColor") return "Gray " + n(c.gray);
      return c.typename;
    } catch (e) { return ""; }
  }
  // الموقع نسبةً لزاوية الصفحة العليا اليسرى
  function geo(it) {
    var b = it.geometricBounds, p = pageOf(b);
    var r = p ? rects[p - 1] : [0, 0, 0, 0];
    return { page: p, x: n(b[0] - r[0]), y: n(r[1] - b[1]), w: n(b[2] - b[0]), h: n(b[1] - b[3]) };
  }
  function layerName(it) { try { return it.layer.name; } catch (e) { return ""; } }

  var rows = [], tfs = doc.textFrames;
  for (var i = 0; i < tfs.length; i++) {
    var t = tfs[i], g = geo(t), font = "", size = "", fill = "", just = "";
    try {
      var ca = t.textRange.characterAttributes;
      font = ca.textFont.name; size = n(ca.size); fill = color(ca.fillColor);
    } catch (e) {}
    try { just = String(t.textRange.paragraphs[0].paragraphAttributes.justification).replace("Justification.", ""); } catch (e) {}
    rows.push([g.page, "text", i, layerName(t), clean(t.name), g.x, g.y, g.w, g.h,
               font, size, fill, just, t.hidden ? 1 : 0, t.locked ? 1 : 0, clean(t.contents)]);
  }

  // العناصر غير النصية في المستوى الأعلى (صور، أشكال، مجموعات)
  function walk(layer) {
    for (var j = 0; j < layer.pageItems.length; j++) {
      var it = layer.pageItems[j];
      if (it.typename == "TextFrame") continue;
      var g = geo(it), fill = "";
      try { if (it.filled) fill = color(it.fillColor); } catch (e) {}
      rows.push([g.page, it.typename, j, layer.name, clean(it.name), g.x, g.y, g.w, g.h,
                 "", "", fill, "", it.hidden ? 1 : 0, it.locked ? 1 : 0, ""]);
    }
    for (var k = 0; k < layer.layers.length; k++) walk(layer.layers[k]);
  }
  for (var L = 0; L < doc.layers.length; L++) walk(doc.layers[L]);

  rows.sort(function (a, b) { return a[0] - b[0] || a[6] - b[6] || a[5] - b[5]; });

  f.encoding = "UTF-8"; f.open("w"); f.write("\uFEFF");
  f.writeln("page\ttype\tid\tlayer\tname\tx\ty\tw\th\tfont\tsize\tcolor\talign\thidden\tlocked\ttext");
  for (var r = 0; r < rows.length; r++) f.writeln(rows[r].join("\t"));
  f.close();
  alert("تم: " + rows.length + " عنصر في " + abs.length + " صفحة");
})();
