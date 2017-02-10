var koModel = {
    selectedArray: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/Helpers/ExpenseTypes#tblExpenseTypes", "tblExpenseTypes"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "expenseTypes",
            properties: ["comments", "name", "deleted", "orderNumber", "forBalance", "periodID", "categoryID", "price", "unitName", "defaultWalletID", "walletEditable", "managerFee", "forSalary"],
            belongs: [{ name: "period", setName: "expensePeriods" }, { name: "category", setName: "expenseCategories" }, { name: "wallet", fkProperty: "defaultWalletID" }]
        }, {
            name: "expensePeriods",
            properties: ["comments", "name", "deleted", "orderNumber", "count"]
        }, {
            name: "expenseCategories",
            properties: ["name", "orderNumber", "deleted"]
        }, {
            name: "wallets",
            properties: ["name", "orderNumber", "deleted", "typeID"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "expenseType") {
            e.ko.include(["period", "category", "wallet"]);
            ko.toDobs(e.ko.price);
            if (e.ko.id() < 0) {
                e.ko.forBalance(1);
                e.ko.price(1);
            }
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.activeExpensePeriods = function (row) {
        return koModel.expensePeriods().where(function (it) { return !it.deleted() || it.id() == row.periodID(); }).orderBy("val=>val.orderNumber()");
    }

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;


        top.busy("UpdateExpenseTypes");
        model.update(function () {
            top.free("UpdateExpenseTypes");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    koModel.create = function () {
        var expenseType = model.expenseTypes.create();
    };

    koModel.remove = function (row) {
        var rows = [];
        if (row.entity) {
            koModel.selectedArray([]);
            rows.push(row);
        } else {
            rows = koModel.selectedArray().select(function (it) { return koModel.expenseTypes().first("val=>val.id()==" + it); });
        }

        var names = ["запись", "записи", "записей"];
        var message = ["Вы действительно хотите удалить ",
                       rows.length == 1 ? names[0] + " " + rows[0].name() : rows.length + " " + i18n.declineCount(rows.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (rows.length == 0 || (rows.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }

        rows.forEach(function (it) {
            if (it.id() > 0) {
                it.name(it.name() ? it.name() : "deleted");

                it.deleted(true);
            } else {
                it.entity.remove();
            }
        });
        koModel.updateAll(function () {
            rows.forEach(function (it) {
                it.entity.detach();
            });
            koModel.selectedArray([]);
        });
    };

    koModel.toExcel = function () {
        var rows = koModel.expenseTypes();
        if (koModel.selectedArray().any()) {
            rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
        }
        var headers = ["Номер", "Название", "Период", "Кошелек", "Можно менять кошелек", "Примечание"];

        var name = ["Типы_расходов_", (new Date()).toSds()].join("");
        rows = rows.select(function (it) {
            return [it.orderNumber(), it.name(), it.period() ? it.period().name() : "", it.wallet() ? it.wallet().name() : "", it.walletEditable() ? "Да" : "Нет", it.comments()];
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblExpenseTypes").koGrid({
        koTemplateID: "trExpenseType",
        headerContainer: $("#divExpenseTypesHeader"),
        styleID: "stlExpenseTypesGrid",
        tableID: "tblExpenseTypes",
        columns: gridSettings || [],
        sortable: true,
        source: koModel.expenseTypes,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    ko.apply(koModel);
});