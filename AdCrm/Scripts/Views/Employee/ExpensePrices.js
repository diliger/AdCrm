var context = {
    expensePrice: {},
    filter: { employeeID: ko.obs(null) },
    grid: $.fn.koGrid.getSaveSettingsObject(host.p + "#tblExpensePrices", "tblExpensePrices"),
    mainKo: window.koModel
};
$(function () {
    window.koModel.expensePricesKoModel = context;

    var koModel = context;
    var data = eval("(" + $("#scrExpensePricesPartialData").text() + ")");
    var model = koModel.mainKo.getModel();
    data = toJsObject(data);

    koModel.employees = koModel.mainKo.employees;
    koModel.expensePrices = koModel.mainKo.expensePrices;
    koModel.expenseTypes = koModel.mainKo.expenseTypes;
    koModel.expenseCategories = koModel.mainKo.expenseCategories;

    model.events.koCreated.attach(function (e) {
        if (e.className == "expensePrice") {
            if (e.ko.id() < 0) {
                e.ko.employeeID(koModel.filter.employeeID());
            }
        } 
    });
    model.addData(data);

    koModel.activeExpenseCategories = function (row) {
        var type = row.expenseType();
        var catID = type ? type.categoryID() : "";
        var cats = koModel.expenseCategories();

        cats = cats.where(function (it) { return !it.deleted() || it.id() == catID; });

        var others = koModel.expenseTypes().where(function (it) { return !it.categoryID() && (!it.deleted() || it.id() == row.expenseTypeID()); }).orderBy("val=>val.orderNumber()");
        if (others.any()) {
            cats.push({ name: "Прочие расходы", expenseTypes: ko.obsa(others) });
        }
        return cats;
    };

    koModel.activeExpenseTypes = function (cat, row) {
        return cat.expenseTypes().where(function (it) { return !it.deleted() || it.id() == row.typeID(); }).orderBy("val=>val.orderNumber()");
    };

    koModel.expensePrice.create = function () {
        model.expensePrices.create();
    };

    koModel.expensePrice.remove = function (expensePrice) {
        var message = ["Вы действительно хотите удалить запись ", expensePrice.expenseType() ? expensePrice.expenseType().name() : "", " (" + expensePrice.value.text() + ")", "?"].join("");

        if (expensePrice.id() > 0 && !confirm(message)) {
            return;
        }
        expensePrice.entity.remove();
        koModel.mainKo.updateAll();
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    koModel.grid.grid = $("#tblExpensePrices").koGrid({
        source: koModel.expensePrices,
        koTemplateID: "trExpensePrice",
        headerContainer: $("#divExpensePricesHeader"),
        styleID: "stlExpensePricesGrid",
        tableID: "tblExpensePrices",
        columns: gridSettings || [],
        sortable: true,
        disallowSort: ["Save", "Index"]
    });

    ko.apply(koModel, $("#divExpensePricesPartial").get(0));

    //koModel.pager.goTo(0);
});