var koModel = {
    filter: { text: ko.obs("") },
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "demountTypes",
            properties: ["comments", "name", "shortName", "deleted", "orderNumber", "code", "rate"]
        }]
    });

    data = ejs.toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "demountType") {
            //ko.toDobs(e.ko.price);
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;


        ejs.busy("UpdateDemountTypes");
        model.update(function () {
            ejs.free("UpdateDemountTypes");
            if (typeof callback == "function") {
                callback();
            }
        });
    };

    var sn = "/Helpers/DemountTypes#tblDemountTypes";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.demountTypesCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.demountTypes,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        //gridParentScroll: "#body",
        gridPadding: 10,
        container: $("#divDemountTypes"),
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 20,
        pure: true,
        //selectMany: true,
        removeField: "deleted",
        columns:
        [{
            title: "Номер",
            name: "orderNumber",
            type: "number"
        }, {
            title: "Код",
            name: "code"
        }, {
            title: "Название",
            name: "name",
            required: true
        }, {
            title: "Коэффициент",
            name: "rate",
            type: "number"
        }, {
            title: "Сокращенное",
            name: "shortName"
        }, {
            title: "Примечание",
            name: "comments",
            type: "textarea"
        }],
        filters: []
    });

    if (!cols) {
        koModel.demountTypesCrud.getPager().refresh();
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