function generatePage() {
    // جمع البيانات من النموذج
    const kindergartenName = document.getElementById('kindergartenName').value;
    const kindergartenLink = document.getElementById('kindergartenLink').value;
    const exerciseDetails = document.getElementById('exerciseDetails').value;

    // التأكد من تعبئة البيانات
    if (!kindergartenName || !kindergartenLink || !exerciseDetails) {
        alert("يرجى تعبئة جميع الحقول");
        return;
    }

    // توليد صفحة HTML جديدة بناءً على المدخلات
    const pageContent = `
        <!DOCTYPE html>
        <html lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${kindergartenName} - الصفحة الرئيسية</title>
        </head>
        <body>
            <h1>مرحبا بكم في ${kindergartenName}</h1>
            <p><a href="${kindergartenLink}">الذهاب إلى صفحة الروضة</a></p>
            <h2>التمارين التفاعلية:</h2>
            <p>تمارين الروضة على الصفحات: ${exerciseDetails}</p>
        </body>
        </html>
    `;

    // رفع المحتوى إلى GitHub (سنستخدم GitHub API هنا)
    console.log("تم توليد الصفحة بنجاح");
    console.log(pageContent);

    // في هذه المرحلة نكتفي بعرض المحتوى فقط لتجربة التوليد
    alert("تم إنشاء صفحة الروضة بنجاح!");
}