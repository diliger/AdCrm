var koModel = {
    grid: $.fn.koGrid.getSaveSettingsObject("/Helpers/PaymentTypes#tblPaymentTypes", "tblPaymentTypes"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "paymentTypes",
            properties: ["name", "factor"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "paymentType") {

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


        top.busy("UpdatePaymentTypes");
        model.update(function () {
            top.free("UpdatePaymentTypes");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblPaymentTypes").koGrid({
        koTemplateID: "trPaymentType",
        headerContainer: $("#divPaymentTypesHeader"),
        styleID: "stlPaymentTypesGrid",
        tableID: "tblPaymentTypes",
        columns: gridSettings || [],
        sortable: true,
        source: koModel.paymentTypes,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    ko.apply(koModel);
});