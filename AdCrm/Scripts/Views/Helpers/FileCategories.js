var koModel = {
};

$(function () {
    ko.precision(4);
    var data = ejs.toJsObject(eval("(" + $("#scrData").html() + ")"));
    var model = new ejs.model({
        sets: [{
            name: "projectFileCategories",
            className: "projectFileCategory",
            properties: ["name", "deleted", "orderNumber"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "projectFileCategory") {
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    var sn = "/Helpers/FileCategories#tblFileCategories";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.projectFileCategoriesCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.projectFileCategories,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridPadding: 10,
        container: $("#divProjectFileCategories"),
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: -1,
        pure: true,
        excel: "Категории вложений",
        removeField: "deleted",
        columns:
        [{
            title: "Название",
            name: "name",
            required: true
        //}, {
        //    title: "Системное название",
        //    name: "sysName"
        }, {
            title: "Порядковый номер",
            name: "orderNumber",
            type: "number"
        }]
    });

    if (!cols) {
        koModel.projectFileCategoriesCrud.getPager().refresh();
    }

    window.setSize = function () {
        var h = $(window).height();
        var div = $(".right-content .container");
        div.css({ height: h - 40 - div.offset().top + "px" });
    };

    setSize();
    $(window).resize(function () {
        setSize();
    });

    ko.apply(koModel);
});