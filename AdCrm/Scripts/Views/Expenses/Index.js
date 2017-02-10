var koModel = {
    filter: {
        year: ko.obs(""),
        month: ko.obs("")
    },
    years: ko.obsa([]),
    months: ko.obsa([]),
    total: ko.obs(0),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "expenses",
            properties: ["comments", "creatorID", "createDate", "date", "name", "walletID", "walletName", "sum", "typeID", "parentID", "periodSum", "count", "price", "employeeName", "projectName", "projectID",
                "employeeID", "creatorName", "salaryEmployeeName", "salaryEmployeeID", "readOnly", "dispatchID", "frozen"],
            belongs: [{ name: "type", setName: "expenseTypes" }, "wallet", "employee"]
        }, {
            name: "expenseTypes",
            properties: ["name", "orderNumber", "deleted", "unitName", "categoryID", "price", "walletName", "defaultWalletID", "walletEditable", "forSalary"],
            belongs: [{ name: "category", setName: "expenseCategories", fkProperty: "categoryID" }]
        }, {
            name: "expenseCategories",
            className: "expenseCategory",
            properties: ["name", "orderNumber", "deleted"],
            hasMany: [{ name: "expenseTypes", fkProperty: "categoryID" }]
        }, {
            name: "projects",
            properties: ["name", "deleted", "archived"]
        }, {
            name: "employees",
            properties: ["surname", "name", "patronymic", "deleted", "walletID", "walletName"]
        }, {
            name: "wallets",
            mode: "expenses",
            properties: ["name", "orderNumber", "deleted", "typeID"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "employee") {
            e.ko.fullName = ko.cmp(function () {
                return [e.ko.surname(), e.ko.name(), e.ko.patronymic()].join(" ");
            });
        } else if (e.className == "expense") {
            e.ko.include(["type"]);
            e.ko.readOnly = ko.obs(e.ko.readOnly() || e.ko.frozen() && host.ur != host.roles.admin);
            e.ko.deletable = ko.cmp(function () { return !e.ko.readOnly(); });

            ko.toDobs([e.ko.periodSum]);
        } else if (e.className == "expenseCategory") {
            e.ko.include(["expenseTypes"]);
        }
    });
    model.events.updated.attach(function (e) {
        koModel.updateTotal();
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.getModel = function () { return model; };
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

    koModel.activeExpenseCategories = function (row) {
        var type = row.type();
        var catID = type ? type.categoryID() : "";
        var cats = koModel.expenseCategories();
        cats = cats.where(function (it) { return !it.deleted() || it.id() == catID; });

        var others = koModel.expenseTypes().where(function (it) { return !it.categoryID() && (!it.deleted() || it.id() == row.typeID()); }).orderBy("val=>val.orderNumber()");
        if (others.any()) {
            cats.push({ name: "Прочие расходы", expenseTypes: ko.obsa(others) });
        }
        return cats;
    };

    koModel.activeExpenseTypes = function (cat, row) {
        return cat.expenseTypes().where(function (it) { return !it.deleted() || it.id() == row.typeID(); }).orderBy("val=>val.orderNumber()");
    };

    koModel.refresh = function () {
        koModel.expensesCrud.getPager().refresh();
    };

    koModel.years().forEach(function (it) {
        it.total = it.months.sum("val=>val.total*1");
    });

    koModel.filter.month.subscribe(function (value) {
        koModel.refresh();
    });
    koModel.filter.year.subscribe(function (value) {
        koModel.refresh();
    });

    koModel.filter.dateFrom = function () {
        var date = new Date();
        date.setDate(1);
        date.setMonth(koModel.filter.month() - 1);
        date.setYear(koModel.filter.year());
        return date.toSds();
    };
    koModel.filter.dateTo = function () {
        var date = new Date();
        date.setDate(1);
        date.setYear(koModel.filter.year());
        date.setMonth(koModel.filter.month());
        date.setDate(0);
        return date.toSds();
    };

    koModel.updateTotal = function () {
        $.rjson({
            url: ApplicationRootPath + "Expenses/TotalJson",
            data: { Options: koModel.expensesPager.gso() },
            success: function (result) {
                result = toJsObject(result);
                result.years.forEach(function (it) {
                    it.total = it.months.sum("val=>val.total*1");
                });
                koModel.years(result.years);
                koModel.total(result.total || 0);
            }
        });
    };

    koModel.export = function () {
        return koModel.expensesCrud['export']();
    };

    koModel.loadProjects = function (request, callback, row) {
        var projectName = row.projectName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == projectName ? "" : filter;

        var where = [];
        var w = ejs.cwp("group", false, "==", "group");
        w.SubParameters = [ejs.cwp("deleted", false, "==", "bool"), ejs.cwp("archived", false, "==", "bool"), ejs.cwp("parentID", true, "isNull")];
        if (row.projectID() > 0) {
            w.SubParameters.push(ejs.cwp("id", row.projectID(), "==", "number", "or"));
        }
        where.push(w);

        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like", "string");
            where.push(w);
        }

        model.projects.select(function (collection, result) {
            var items = result.allEntities.select(function (item) { return { label: item.name(), value: item.name(), source: item }; });

            if (typeof callback == "function") {
                callback(items.orderBy("val=>val.label.toLowerCase()"));
            } else {
                return items;
            }
        }, where, [ejs.cop("name")], 20);
    };

    koModel.loadEmployees = function (request, callback, row) {
        var name = row.employeeName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [];
        var w = ejs.cwp("group", false, "==", "group");
        w.SubParameters = [ejs.cwp("deleted", false, "==", "bool"), ejs.cwp("archived", false, "==", "bool")];
        if (row.employeeID() > 0) {
            w.SubParameters.push(ejs.cwp("id", row.employeeID(), "==", "number", "or"));
        }
        where.push(w);

        if (filter) {
            var w = ejs.cwp("group", "%" + filter + "%", "like", "group");
            w.SubParameters = [ejs.cwp("name", "%" + filter + "%", "like", "string", "or"), ejs.cwp("surname", "%" + filter + "%", "like", "string", "or"), ejs.cwp("patronymic", "%" + filter + "%", "like", "string", "or")];
            where.push(w);
        }

        model.employees.select(function (collection, result) {
            var items = result.allEntities.select(function (item) { return { label: item.toKo().fullName(), value: item.toKo().fullName(), source: item }; });

            if (typeof callback == "function") {
                callback(items.orderBy("val=>val.label.toLowerCase()"));
            } else {
                return items;
            }
        }, where, "", 20);
    };

    koModel.loadWallets = function (request, callback, row, p) {
        var name = row.walletName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool")];
        if (koModel.filter.employeeID > 0) {
            where.push(ejs.cwp("forEmployeeExpense", koModel.filter.employeeID, "=", "number"));
        }
        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.wallets, where, [ejs.cop("name")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.wallets.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };

    koModel.openAutocomplete = function (data, e) {
        var div = $(e.target).parent();

        div.find("input").focus().trigger('keydown.autocomplete')
        div.find("input").autocomplete("search")
    };

    initExpenses(koModel, model, data);

    ko.apply(koModel);

    window.setSize = function () {
        var h = $(window).height();
        var div = $(".right-content, .left-menu");
        div.each(function () { $(this).css({ height: h - 42 - $(this).offset().top + "px" }); });
    };

    setSize();
    $(window).resize(function () {
        setSize();
    });
});

function initExpenses(koModel, model, data) {
    var sn = data.page + "#tblExpenses";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    var filters = [{
        property: "date",
        value: koModel.filter.dateFrom,
        type: "date",
        condition: ">="
    }, {
        property: "date",
        value: koModel.filter.dateTo,
        type: "date",
        condition: "<="
        //}, {
        //    property: "group", value: koModel.filter.likeKeywords, condition: "like", innerOperand: "or", type: "group",
        //    filters: ["projectName", "project.ProjectType.Name", "employee.FullName", "name", "status.Name", "statusText", "userResponsible.FullName", "previousTask.Name", "message", "description", "priority.Name", "version", "type.Name"]
    }];

    if (host.ur == host.roles.manager) {
        filters.push({
            type: "group", property: "manager", innerOperand: "or", value: true,
            filters: [{ property: "creatorID", type: "number", condition: "=", value: host.uid },
            { property: "employeeID", type: "number", condition: "=", value: host.eid },
            { property: "project.ResponsibleID", type: "number", condition: "=", value: host.uid }]
        });
    }

    koModel.expensesCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.expenses,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".right-content",
        gridPadding: 10,
        container: $("#divExpenses"),
        selectMany: true,
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pure: true,
        excel: "Расходы",
        pageSize: 100,
        columns: getExpenseColumns(koModel, model, data),
        filters: filters
    });

    koModel.expensesCrud.events.editing.attach(function (e) {
        if (e.row.readOnly()) {
            e.cancel = true;
            var m = "Вы не можете редактировать эту запись!";
            ejs.alert(m, m);
        }
    });

    koModel.expensesCrud.events.edited.attach(function (e) {
        var dlg = koModel.expensesCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование расхода" });
    });

    koModel.expensesCrud.events.created.attach(function (e) {
        var dlg = koModel.expensesCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание расхода" });
    });

    koModel.expensesPager.events.pageChanged.attach(function () {
        koModel.updateTotal();
    });

    if (!cols) {
        koModel.expensesPager.refresh();
    }
};

function getExpenseColumns(koModel, model, data) {
    var columns = [];
    columns.push({
        title: "ID",
        name: "id",
        type: "number",
        showOnly: true,
        filter: true
    }, {
        title: "Дата",
        name: "date",
        type: "date",
        defaultValue: new Date().toSds(),
        filter: true
    }, {
        title: "Автор",
        name: "creator",
        value: "creatorName",
        orderBy: "UserCreator.FullName",
        filterName: "UserCreator.FullName",
        disable: true,
        filter: true
    }, {
        title: "Проект",
        name: "projectID",
        orderBy: "projectName",
        value: "projectName",
        type: "autocomplete",
        method: "loadProjects",
        filterType: "string",
        filterName: "projectName",
        filter: true
    }, {
        title: "Сотрудник",
        name: "employeeID",
        orderBy: "employee.FullName",
        value: "employeeName",
        type: "autocomplete",
        method: "loadEmployees",
        filterType: "string",
        filterName: "employee.FullName",
        filter: true
    }, {
        title: "Сумма (руб.)",
        name: "periodSum",
        value: "periodSum.text",
        //type: "number",
        filterType: "number",
        filter: true
    }, {
        title: "Тип",
        name: "typeID",
        orderBy: "type.Name",
        value: "type().name",
        editTemplate: "#scrTypeSelect",
        filterType: "select",
        filterOptions: "expenseTypes().orderBy(\"val=>val.name()\")",
        required: true,
        filter: true
    }, {
        title: "Для сотрудника",
        name: "salaryEmployeeID",
        orderBy: "salaryEmployee.FullName",
        value: "salaryEmployeeName",
        type: "autocomplete",
        method: "loadEmployees",
        visible: "type().forSalary",
        filterType: "string",
        filterName: "salaryEmployee.FullName",
        required: true,
        filter: true
    }, {
        title: "С кошелька",
        name: "walletID",
        orderBy: "wallet.Name",
        value: "walletName",
        type: "autocomplete",
        method: "loadWallets",
        filterType: "string",
        filterName: "wallet.Name",
        required: true,
        filter: true
    }, {
        title: "Примечание",
        name: "comments",
        type: "textarea",
        filterType: "string",
        filter: true
    });
    return columns;
}

//function loadHtml() {
//    $.ajax({
//        url: ApplicationRootPath + "Expenses/ListPartial/" + host.p + "?ViewType=0",
//        success: function (result) {
//            $("#divRightContent .container").append(result);
//            koModel.expensesKoModel.filter.dateFrom = function () {
//                var date = new Date();
//                date.setDate(1);
//                date.setMonth(koModel.filter.month() - 1);
//                date.setYear(koModel.filter.year());
//                return date.toSds();
//            };
//            koModel.expensesKoModel.filter.dateTo = function () {
//                var date = new Date();
//                date.setDate(1);
//                date.setYear(koModel.filter.year());
//                date.setMonth(koModel.filter.month());
//                date.setDate(0);
//                return date.toSds();
//            };
//            window.setLeftMenuHeight();
//            koModel.expensesKoModel.refresh();
//        }
//    });
//};