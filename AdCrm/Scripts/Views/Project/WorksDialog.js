var workTypesDialogKoModel = {
    selectedArray: ko.obsa([]),
    filter: { text: ko.obs(""), customerID: ko.obs("") },//, contractID: ko.obs("") , contractPageID: ko.obs("") },
    grid: $.fn.koGrid.getSaveSettingsObject("/Project/WorksDialog#tblWorkTypes", "tblWorkTypes"),
    onClosed: ko.obs(null),
    result: ko.obs(""),
    title: ko.obs(""),
    defer: true
};

function initWorksDialog() {
    var div = $("#divWorksDialog");
    var context = workTypesDialogKoModel;
    if (koModel && !koModel.workTypesDialogKoModel) {
        koModel.workTypesDialogKoModel = context;
    }
    var koModel = context;
    var data = ejs.toJsObject(eval("(" + $("#scrWorksDialogData").text() + ")"));
    var model = top.koModel.getModel();
    //koModel.contractorWorks = top.koModel.contractorWorks;

    model.events.koCreated.attach(function (e) {
        if (e.className == "workType") {
            //e.ko.include("customer");
            //e.ko.contractorPrice = ko.cmp(function () {
            //    var cw = koModel.contractorWorks().first("val=>val.workTypeID()==" + e.ko.id());
            //    return cw ? cw.price() : e.ko.price();
            //});
            //e.ko.contractorCode = ko.cmp(function () {
            //    var cw = koModel.contractorWorks().first("val=>val.workTypeID()==" + e.ko.id());
            //    return cw ? cw.code() || e.ko.code() : e.ko.code();
            //});
            //ko.toDobs(e.ko.contractorPrice);
            ko.toDobs(e.ko.price);
        }
    });

    context.workTypes = model.workTypes.toKo();

    context.filter.likeText = ko.cmp(function () {
        return "%" + context.filter.text() + "%";
    });

    context.pager = new ejs.remotePager({
        set: model.workTypes,
        model: model,
        pageSize: 50,
        filters: [{
            property: "Deleted",
            value: false,
            type: "bool"
            //}, {
            //    property: "contractorID",
            //    value: koModel.filter.customerID,
            //    type: "number"
            //}, {
            //    property: "contractID",
            //    value: koModel.filter.contractID,
            //    type: "number"
            //}, {
            //    property: "pageID",
            //    value: koModel.filter.contractPageID,
            //    type: "number"
        }, {
            value: function () { return isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%"; },
            condition: "like", type: "group", property: "group", innerOperand: "or",
            filters: ["Name", "ShortName", "Code", "Comments"]
        }]
        //includes: [ejs.cip(model.workTypes)]
    });

    context.pager.events.pageChanging.attach(function (e) {
        e.cancel = context.defer;
        context.selectedArray([]);
        model.workTypes.refreshData([]);
    });

    context.clear = function () {
        //context.filter.customerID("");
        //context.filter.contractID("");
        //context.filter.contractPageID("");
        context.filter.text("");
        context.selectedArray([]);
        context.result("");
    };

    context.applyFilter = function (data, event) {
        if (event.keyCode == 13 || event.which == 13) {
            var element = $(event.target);
            setTimeout(function () {
                element.change();
                context.pager.refresh();
            }, 100);
        }
        return true;
    };

    context.show = function (title, customerID) {//, contractID, pageID) {
        context.defer = false;
        if (title) {
            context.title(title);
            div.dialog({ title: context.title() });
        }
        //context.filter.customerID(customerID);
        //context.filter.contractID(contractID);
        //context.filter.contractPageID(pageID);

        context.pager.refresh();

        div.dialog("open");
        return context.onClosed;
    };

    context.close = function (result) {
        context.result(result);
        div.dialog("close");
    };

    var buttons = [{ text: 'OK', click: function () { context.close(true); } },
            { text: 'Отмена', click: function () { context.close(false); } }];
    if (host.ur < 3) {
        buttons.unshift({ text: "Открыть справочник", click: function () { window.open(host.arp + "Helpers/WorkTypes", "_blank"); }, "class": "center" });
    }

    div.dialog({
        width: 800,
        buttons: buttons,
        modal: true,
        autoOpen: false,
        open: function () {
            $("#divWorkTypes").height($("#divWorksDialog").height() - 50);
        },
        close: function () {
            var works = context.selectedArray().select(function (it) { return context.workTypes().first("val=>val.id()==" + it); });
            if (typeof context.onClosed() == "function") {
                context.onClosed()(context.result(), works);
            }
            context.clear();
        }
    });

    var gridSettings = data.settings.first("val=>val.name=='" + context.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblWorkTypes").koGrid({
        koTemplateID: "trWorkType",
        headerContainer: $("#divWorkTypesHeader"),
        styleID: "stlWorkTypesGrid",
        tableID: "tblWorkTypes",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: context.pager.order,
        disallowSort: ["Save", "Select"]
    });
    context.grid.sorted = grid.sorted;

    ko.apply(context, div.get(0));
}

$(initWorksDialog);