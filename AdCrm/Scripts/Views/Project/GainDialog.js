var gainDialogKoModel = {
    projectID: ko.obs(""),
    data: ko.obs(null),
    title: ko.obs("")
};

function initGainDialog() {
    var div = $("#divGainDialog");
    var context = gainDialogKoModel;
    if (koModel && !koModel.gainDialogKoModel) {
        koModel.gainDialogKoModel = context;
    }

    context.monthes = $.datepicker._defaults.monthNames;

    context.show = function (title) {
        if (title) {
            context.title(title);
        } else {
            context.title(koModel.project.name());
        }

        top.busy("GainLoading");
        $.rjson({
            url: ApplicationRootPath + "Project/GainJson",
            data: { ID: context.projectID() },
            success: function (result) {
                top.free("GainLoading");
                result = toJsObject(result);
                context.data(result);
                div.dialog("open");
            },
            error: function () {
                top.free("GainLoading");
                alert("Произошла непредвиденная ошибка :(");
            }
        });
    };

    div.dialog({
        title: context.title(),
        width: 600,
        modal: false,
        autoOpen: false,
        resizable: true,
        buttons: [{ text: 'Закрыть', click: function () { div.dialog("close"); } }],
        open: function () { div.dialog({ title: context.title() }); }
    });

    ko.apply(context, div.get(0));
}

$(initGainDialog);