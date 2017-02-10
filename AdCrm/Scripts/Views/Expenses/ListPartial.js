var context = {
    defer: true,
    expense: { selectedArray: ko.obsa([]), current: ko.obs(null) },
    filter: { dateFrom: null, dateTo: null, employeeID: null, projectID: null, categoryID: ko.obs("") },
    grid: $.fn.koGrid.getSaveSettingsObject(host.p + "#tblExpenses", "tblExpenses"),
    mainKo: window.koModel
};
$(function () {
    window.koModel.expensesKoModel = context;

    var koModel = context;
    var data = eval("(" + $("#scrExpensesPartialData").text() + ")");
    var model = koModel.mainKo.getModel();
    data = toJsObject(data);
    if (koModel.mainKo.expense && koModel.mainKo.expense.selectedArray) {
        koModel.expense.selectedArray = koModel.mainKo.expense.selectedArray;
    }

    koModel.projects = koModel.mainKo.projects;
    koModel.employees = koModel.mainKo.employees;
    koModel.expenses = koModel.mainKo.expenses;
    koModel.wallets = koModel.mainKo.wallets;
    koModel.expenseTypes = koModel.mainKo.expenseTypes;
    koModel.expenseCategories = koModel.mainKo.expenseCategories;

    model.events.koCreated.attach(function (e) {
        if (e.className == "expense") {
            e.ko.include(["type", "employee"]);
            ko.toDobs(e.ko.sum);
            ko.toDobs(e.ko.count);
            ko.toDobs(e.ko.price);
            ko.toDobs(e.ko.periodSum);
            e.ko.employeeID.subscribe(function (value) {
                var emp = e.ko.employee();
                var type = e.ko.type();
                if (e.ko.entity.inParse || !emp)
                    return;
                if (!type || !e.ko.walletID() || e.ko.walletID() != type.defaultWalletID()) {
                    e.ko.walletID(emp.walletID());
                    e.ko.walletName(emp.walletName());
                }
            });
            e.ko.typeID.subscribe(function (value) {
                var type = e.ko.type();
                var employee = e.ko.employee();
                if (e.ko.entity.inParse || !type)
                    return;
                //var emp = (typeof koModel.filter.employeeID == "function" ? koModel.filter.employeeID() : koModel.filter.employeeID);
                //var price = type.expensePrices ? type.expensePrices().first("val=>val.employeeID()=='" + emp + "'") : null;
                if (e.ko.price() == 0)
                    e.ko.price(type.price());

                if (type.defaultWalletID() > 0) {
                    e.ko.walletID(type.defaultWalletID());
                    e.ko.walletName(type.walletName());
                } else if (!type.walletEditable()) {
                    e.ko.walletID(employee ? employee.walletID() : "");
                    e.ko.walletName(employee ? employee.walletName() : "");
                }
            });
            //e.ko.count.subscribe(function (value) {
            //    if (e.ko.entity.inParse)
            //        return;
            //    e.ko.periodSum(e.ko.count() * e.ko.price());
            //});
            e.ko.price.subscribe(function (value) {
                if (e.ko.entity.inParse)
                    return;
                e.ko.periodSum(e.ko.count() * e.ko.price());
            });
            e.ko.periodSum.subscribe(function (value) {
                if (e.ko.entity.inParse)
                    return;
                e.ko.price(value);
                //if (e.ko.price() != 0) {//e.ko.count() == 0 && 
                //    e.ko.count(e.ko.periodSum() / e.ko.price());
                //    //} else if (e.ko.count() != 0) {
                //    //    e.ko.price(e.ko.periodSum() / e.ko.count());
                //}
            });

            if (e.ko.id() < 0) {
                var cat = koModel.activeExpenseCategories(e.ko).first();
                var type = cat ? cat.expenseTypes().first() : "";
                if (koModel.filter.dateFrom && koModel.filter.dateFrom()) {
                    e.ko.date(koModel.filter.dateFrom());
                } else {
                    e.ko.date((new Date()).toSds());
                }
                e.ko.typeID(type ? type.id() : "");

                var emp = (typeof koModel.filter.employeeID == "function" ? koModel.filter.employeeID() : koModel.filter.employeeID);
                if (emp) {
                    e.ko.employeeID(emp);
                }

                var p = (typeof koModel.filter.projectID == "function" ? koModel.filter.projectID() : koModel.filter.projectID);
                if (p) {
                    e.ko.projectID(p);
                }
            }
        } else if (e.className == "expenseCategory") {
            e.ko.include("expenseTypes");
        } else if (e.className == "employee") {
            if (!e.ko.fullName) {
                e.ko.fullName = ko.cmp(function () {
                    return [e.ko.surname(), e.ko.name(), e.ko.patronymic()].join(" ");
                });
            }
        } else if (e.className == "expenseType") {
            if (model.expensePrices) {
                e.ko.include("expensePrices");
            }
        }
    });
    model.events.updated.attach(function (e) {
        if (!model.hasChanges()) {
            koModel.expense.current(null);
        }
    });
    model.addData(data);

    var filters = [{
        property: "date",
        value: function () { return typeof koModel.filter.dateFrom == "function" ? koModel.filter.dateFrom() : koModel.filter.dateFrom; },
        type: "date",
        condition: ">="
    }, {
        property: "date",
        value: function () { return typeof koModel.filter.dateTo == "function" ? koModel.filter.dateTo() : koModel.filter.dateTo; },
        type: "date",
        condition: "<="
    }, {
        property: "employeeID",
        value: function () { return typeof koModel.filter.employeeID == "function" ? koModel.filter.employeeID() : koModel.filter.employeeID; },
        type: "number",
        condition: "=="
    }, {
        property: "projectID",
        value: function () { return typeof koModel.filter.projectID == "function" ? koModel.filter.projectID() : koModel.filter.projectID; },
        type: "number",
        condition: "=="
    }, {
        property: "type.CategoryID",
        value: function () { var cat = (typeof koModel.filter.categoryID == "function" ? koModel.filter.categoryID() : koModel.filter.categoryID); return cat == 1 || cat == 2 ? cat : ""; },
        type: "number",
        condition: "=="
    }, {
        type: "group", property: "group", innerOperand: "or", value: function () { return koModel.filter.categoryID() === 0 ? true : ""; },
        filters: [{ property: "type.CategoryID", condition: "isNull", value: function () { return koModel.filter.categoryID() === 0 ? true : ""; } },
        { property: "type.CategoryID", type: "number", condition: "!=", value: function () { return koModel.filter.categoryID() === 0 ? 1 : ""; } },
        { property: "type.CategoryID", type: "number", condition: "!=", value: function () { return koModel.filter.categoryID() === 0 ? 2 : ""; }, operand: "and" }]
    }];

    if (host.ur == host.roles.manager) {
        filters.push({
            type: "group", property: "manager", innerOperand: "or", value: true,
            filters: [{ property: "creatorID", type: "number", condition: "=", value: host.uid },
            { property: "employeeID", type: "number", condition: "=", value: host.eid },
            { property: "project.ResponsibleID", type: "number", condition: "=", value: host.uid }]
        });
    }
    koModel.pager = new ejs.remotePager({
        set: model.expenses,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: filters
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });
    koModel.pager.events.pageChanging.attach(function (e) {
        e.cancel = koModel.defer;
    });

    koModel.activeExpenseCategories = function (row) {
        var type = row.type();
        var catID = type ? type.categoryID() : "";
        var cats = koModel.expenseCategories();
        var cat = koModel.filter.categoryID();
        cats = cats.where(function (it) { return !it.deleted() && (cat === 0 && it.id() != 1 && it.id() != 2 || it.id() == cat || isEmpty(cat + "")) || it.id() == catID; });

        var others = koModel.expenseTypes().where(function (it) { return !it.categoryID() && (!it.deleted() || it.id() == row.typeID()); }).orderBy("val=>val.orderNumber()");
        if (others.any() && cat != 1 && cat != 2) {
            cats.push({ name: "Прочие расходы", expenseTypes: ko.obsa(others) });
        }
        return cats;
    };

    koModel.activeExpenseTypes = function (cat, row) {
        return cat.expenseTypes().where(function (it) { return !it.deleted() || it.id() == row.typeID(); }).orderBy("val=>val.orderNumber()");
    };

    koModel.changeCategory = function (id) {
        if (id !== koModel.filter.categoryID()) {
            model.expenses.refreshData([]);
            koModel.filter.categoryID(id);
        }
        koModel.refresh();
    };

    koModel.refresh = function () {
        koModel.defer = false;
        koModel.expense.selectedArray([]);
        koModel.pager.goTo(0);
    };

    koModel.expense.selectedTotal = ko.cmp(function () {
        var expenses = koModel.expense.selectedArray().select(function (it) { return koModel.expenses().first("val=>val.id()==" + it); });
        return expenses.sum("val=>val.sum()");
    });

    koModel.expense.create = function () {
        var expense = model.expenses.create().toKo();
        expense.count(1);
        koModel.expense.current(expense);
        return expense;
    };

    koModel.expense.copy = function (row) {
        var expense = koModel.expense.create();
        expense.typeID(row.typeID());
        expense.periodSum(row.periodSum());
        expense.walletID(row.walletID());
        expense.employeeID(row.employeeID());
        expense.employeeName(row.employeeName());
        expense.walletName(row.walletName());
        return expense;
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
        koModel.mainKo.updateAll();
    };
    koModel.expense.edit = function (row) {
        if (row.parentID() > 0) {
            alert("Расход созданный на основании другого расхода не может быть изменен!");
            return;
        }
        koModel.expense.current(row);
    };

    koModel.expense.apply = function (row) {
        koModel.expense.current(null);
    };

    koModel.toExcel = function () {
        var so = koModel.pager.gso();
        var name = ["Расходы_", koModel.filter.dateFrom(), "_", koModel.filter.dateTo()].join("");
        var fields = [{ name: "Дата", value: "date" }, { name: "Проект", value: "project.Name" }, { name: "Сотрудник", value: "Employee.FullName" }, { name: "Ед. Измерения", value: "Type.UnitName" }, { name: "Кол-во", value: "count" },
            { name: "Цена", value: "price" }, { name: "Тип", value: "type.Name" }, { name: "Название", value: "name" }, { name: "Кошелек", value: "wallet.Name" }, { name: "Сумма", value: "sum" }, { name: "Примечание", value: "comments" }];
        model['export']({ selectOptions: so, name: name, parameters: fields });
    };

    koModel.loadProjects = function (request, callback, row) {
        var projectName = row.projectName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == projectName ? "" : filter;

        var items = koModel.projects().where("val=>!val.deleted()&&!val.archived()||val.id()=='" + row.projectID() + "'");
        if (filter.length <= 2 && items.where("val=>val.name().contains('" + filter + "',1)").length > 10) {

            var items = items.where("val=>val.name().contains('" + filter + "',1)").orderBy("val=>val.name().toLowerCase()").select(function (item) {
                return { label: item.name(), value: item.name(), source: item };
            });

            if (typeof callback == "function") {
                callback(items);
            } else {
                return items;
            }
        } else {
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
                var items = result.allEntities.select(function (item) { return { label: item.name(), value: item.name(), source: item }; });// + (item.address() ? ", " + item.address() : "")

                if (typeof callback == "function") {
                    callback(items.orderBy("val=>val.label.toLowerCase()"));
                } else {
                    return items;
                }
            }, where, [ejs.cop("name")], 20);
        }
    };

    koModel.loadEmployees = function (request, callback, row) {
        var name = row.employeeName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var items = koModel.employees().where("val=>!val.deleted()||val.id()=='" + row.employeeID() + "'");
        if (filter.length <= 2 && items.where("val=>val.fullName().contains('" + filter + "',1)").length > 10) {

            var items = items.where("val=>val.fullName().contains('" + filter + "',1)").orderBy("val=>val.fullName().toLowerCase()").select(function (item) {
                return { label: item.fullName(), value: item.fullName(), source: item };
            });

            if (typeof callback == "function") {
                callback(items);
            } else {
                return items;
            }
        } else {
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
        }
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
        disallowSort: ["Save", "Select", "Index"]
    });

    ko.apply(koModel, $("#divExpensesPartial").get(0));

    //koModel.pager.goTo(0);
});