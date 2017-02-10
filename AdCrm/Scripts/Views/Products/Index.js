var koModel = {
    filter: {
        text: ko.obs("")
    }
};

$(function () {
    var data = ejs.toJsObject(eval("(" + $("#scrData").html() + ")"));
    var model = new ejs.model({
        sets: [{
            name: "products",
            properties: ["name", "count", "sysName", "outerID", "description", "price", "priceSell"],
            belongs: []
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "product") {

        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    var sn = "/Products/Index#tblProducts";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.productsCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.products,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: "#divRightContent",
        gridPadding: 10,
        gridFilter: true,
        container: $("#divProducts"),
        create: false,
        edit: true,
        remove: false,
        autoSave: true,
        pageSize: 20,
        pure: true,
        selectMany: true,
        excel: "Товары",
        columns:
        [{
            title: "Название",
            name: "name",
            filter: true,
            filterType: "string"
        }, {
            title: "1С ID",
            name: "outerID",
            disable: true,
            filter: true,
            filterType: "string"
        }, {
            title: "Остаток",
            name: "count",
            disable: true,
            type: "number",
            filter: true,
            filterType: "number"
        }, {
            title: "Цена",
            name: "price",
            disable: true,
            type: "number",
            filter: true,
            filterType: "number"
        }, {
            title: "Цена расчетная",
            name: "priceSell",
            disable: true,
            type: "number",
            filter: true,
            filterType: "number"
        }, {
            title: "Описание",
            name: "description",
            type: "textarea",
            filter: true,
            filterType: "string"
        }],
        filters: []
    });

    if (!cols) {
        koModel.productsCrud.getPager().refresh();
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