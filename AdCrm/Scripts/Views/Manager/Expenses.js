var koModel = {
    filter: {
        year: ko.obs(""),
        month: ko.obs("")
    },
    years: ko.obsa([]),
    months: ko.obsa([]),
    expense: {
        selectedArray: ko.obsa([])
    },
    grid: {
        name: "/Manager/Expenses#tblExpenses",
        save: function () {
            var value = $("#tblExpenses").koGrid("getColumns");
            var name = koModel.grid.name;

            koModel.grid.inProgress(true);
            saveSetting(name, value, function () {
                koModel.grid.inProgress(false);
            });
        },
        inProgress: ko.obs(false)
    },
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "expenses",
            properties: ["comments", "creatorID", "createDate", "date", "name", "sum", "typeID", "parentID", "periodSum", "creatorName", "salaryEmployeeName", "salaryEmployeeID", "readOnly", "dispatchID", "frozen"],
            belongs: [{ name: "type", setName: "expenseTypes" }]
        }, {
            name: "expenseTypes",
            properties: ["name", "orderNumber", "deleted", "forSalary"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "expense") {
            e.ko.include(["type"]);
            ko.toDobs(e.ko.sum);
            ko.toDobs(e.ko.periodSum);
            if (e.ko.id() < 0) {
                e.ko.date((new Date()).toSds());
                e.ko.typeID(koModel.expenseTypes().first("val=>!val.deleted()").id());
            }
            e.ko.readOnly = ko.obs(e.ko.readOnly() || e.ko.frozen() && host.ur != host.roles.admin);
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.filter.year(data.year);
    koModel.filter.month(data.month);
    koModel.years(data.years);
    koModel.months(data.months.where("val=>val").select(function (it, i) {
        var result = {
            name: it,
            id: i + 1
        };

        return result;
    }));

    koModel.years().forEach(function (it) {
        //it.months.forEach(function (month) {
        //    month.total = ko.obs(month.total * 1);
        //    ko.toDobs(month.total);
        //});
        //it.total = ko.cmp(function () {
        //    return it.months.sum("val=>val.total()*1");
        //});
        //ko.toDobs(it.total);
        it.total = it.months.sum("val=>val.total*1");
    });

    koModel.filter.month.subscribe(function () {
        koModel.refresh();
    });
    koModel.filter.year.subscribe(function () {
        koModel.refresh();
    });

    koModel.pager = new ejs.remotePager({
        set: model.expenses,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: [{
            property: "date",
            value: function () {
                var date = new Date();
                date.setDate(1);
                date.setMonth(koModel.filter.month() - 1);
                date.setYear(koModel.filter.year());
                return date.toSds();
            },
            type: "date",
            condition: ">="
        }, {
            property: "date",
            value: function () {
                var date = new Date();
                date.setDate(1);
                date.setYear(koModel.filter.year());
                date.setMonth(koModel.filter.month());
                date.setDate(0);
                return date.toSds();
            },
            type: "date",
            condition: "<="
        }]
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.activeExpenseTypes = function (row) {
        return koModel.expenseTypes().where(function (it) { return !it.deleted() || it.id() == row.typeID(); });
    };

    koModel.updateTotal = function () {
        $.rjson({
            url: ApplicationRootPath + "Manager/ExpensesTotalJson",
            success: function (result) {
                result = toJsObject(result);
                result.years.forEach(function (it) {
                    it.total = it.months.sum("val=>val.total*1");
                });
                koModel.years(result.years);
            }
        });
    };

    koModel.updateAll = function (callback) {
        if (!koModel.hasChanges())
        {
            if (typeof callback == "function") {
                callback();
            }
            return;
        }

        top.busy("UpdateExpenses");
        model.update(function () {
            top.free("UpdateExpenses");
            if (typeof callback == "function") {
                callback();
            }
            koModel.updateTotal();
        });
    };

    koModel.refresh = function () {
        koModel.expense.selectedArray([]);
        koModel.pager.goTo(0);
    };

    koModel.expense.selectedTotal = ko.cmp(function () {
        var expenses = koModel.expense.selectedArray().select(function (it) { return koModel.expenses().first("val=>val.id()==" + it); });
        return expenses.sum("val=>val.sum()");
    });

    koModel.expense.create = function () {
        var expense = model.expenses.create();
    };

    koModel.expense.remove = function (expense) {
        var expenses = [];
        if (expense.entity) {
            koModel.expense.selectedArray([]);
            expenses.push(expense);
        } else {
            expenses = koModel.expense.selectedArray().select(function (it) { return koModel.expenses().first("val=>val.id()==" + it); });
        }

        if (expenses.any("val=>val.parentID()>0")) {
            alert("Расход созданный на основании другого расхода не может быть удален!");
            return;
        }

        var names = ["расход", "расхода", "расходов"];
        var message = ["Вы действительно хотите удалить ",
                       expenses.length == 1 ? names[0] + " " + expenses[0].name() : expenses.length + " " + i18n.declineCount(expenses.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (expenses.length == 0 || (expenses.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }

        koModel.expense.selectedArray([]);

        expenses.forEach(function (it) {
            it.entity.remove();
        });
        koModel.updateAll();
    };
    
    koModel.toExcel = function () {
        var expenses = koModel.expenses();
        if (koModel.expense.selectedArray().any()) {
            expenses = koModel.expense.selectedArray().select(function (it) { return expenses.first("val=>val.id()==" + it); });;
        }
        var headers = ["Тип", "Название", "Сумма"];

        var name = ["Расходы_", koModel.filter.year(), "_", koModel.filter.month()].join("");
        var rows = expenses.select(function (it) {
            return [it.type().name(), it.name(), it.sum()];
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

    $("#tblExpenses").koGrid({
        koTemplateID: "trExpense",
        headerContainer: $("#divExpensesHeader"),
        styleID: "stlExpensesGrid",
        tableID: "tblExpenses",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        //source: koModel.project.rows,
        disallowSort: ["Save", "Select"]
    });

    ko.apply(koModel);

    koModel.pager.goTo(0);
});
