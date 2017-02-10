var reportDialogKoModel = {
    title: ko.obs("")
};

function initContractorsDialog() {
    $("head").append("<link href='" + ApplicationRootPath + "Content/ProjectReport.css' rel='stylesheet' type='text/css'>")

    var div = $("#divProjectReportDialog");
    var context = reportDialogKoModel;
    if (koModel && !koModel.reportDialogKoModel) {
        koModel.reportDialogKoModel = context;
    }

    context.show = function (title) {
        $.rjson({
            url: ApplicationRootPath + "Project/GainJson",
            data: { ID: koModel.project.id() },
            success: function (result) {
                result = toJsObject(result);
                koModel.project.gain(result.gain);
            },
            error: function () {
                alert("Произошла непредвиденная ошибка :(");
            }
        });

        if (title) {
            context.title(title);
        } else {
            context.title(koModel.project.name() + (koModel.project.contractor() ? ", " + koModel.project.contractor().name() : ""));
        }
        div.dialog("open");
    };

    div.dialog({
        title: context.title(),
        width: 1200,
        modal: false,
        autoOpen: false,
        resizable: true,
        buttons: [/*{ text: 'Экспорт в Excel' }, { text: 'Печать', click: function () { if (!div.find("form:first").valid()) return; koModel.dialog.payments.result(true); div.dialog("close"); } },*/
                        {text: 'Закрыть', click: function () { div.dialog("close"); } }],
        open: function () { div.dialog({ title: context.title() }); }
    });

    ko.apply(koModel, div.get(0));
}

$(initContractorsDialog);