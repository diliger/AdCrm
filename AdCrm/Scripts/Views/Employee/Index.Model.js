var koModel = {
    filter: {
        year: ko.obs(""),
        month: ko.obs(""),
        project: ko.obs("")
    },
    selected: {
        itabID: ko.obs(1)
    },
    itabs: ko.obsa([{
        id: 1,
        name: "расходы"
    }, {
        id: 2,
        name: "подотчетные деньги"
    }, {
        id: 3,
        name: "передача денег"
    //}, {
    //    id: 4,
    //    name: "стоимость расходов"
    }, {
        id: 5,
        frmID: "frmTasks",
        name: "задачи",
        url: host.arp + "Employee/Tasks/{0}"
    }, {
        id: 5,
        frmID: "frmSalary",
        name: "зарплата",
        url: host.arp + "Employee/Salary/{0}"
    }]),
    years: ko.obsa([]),
    hideThePage: ko.obs(false)
};

$(function () {
    //ko.precision(4);
    var data = eval("(" + $("#scrData").html().trim() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "projects",
            properties: ["address", "name", "deleted", "archived"]
        }, {
            name: "employees",
            properties: ["comments", "createDate", "departmentID", "surname", "name", "patronymic", "positionID", "departmentName", "salaryChangeDate", "lastSalary", "deleted", "archived", "archiveDate", "balance",
            "passportIssueDate", "passportIssuer", "passportNumber", "passportSerie", "addressLive", "addressRegistration", "phone", "userID", "userLogin", "walletID", "walletName", "email", "salaryBalance", "pictureID", "pictureName"],
            belongs: [{ name: "position" }, { name: "department" }],
            hasMany: [{ name: "workLogs" }, { name: "expensePrices" }]
        }, {
            name: "departments",
            properties: ["comments", "name", "deleted", "orderNumber"],
            hasMany: [{ name: "employees" }, { name: "positions" }]
        }, {
            name: "positions",
            properties: ["comments", "name", "deleted", "departmentID", "orderNumber"],
            hasMany: [{ name: "employees" }]
        }, {
            name: "expenses",
            properties: ["comments", "creatorID", "createDate", "date", "name", "sum", "typeID", "parentID", "periodSum", "count", "price", "employeeName", "projectName", "projectID", "employeeID",
                "walletID", "walletName", "creatorName", "salaryEmployeeName", "salaryEmployeeID", "readOnly", "dispatchID", "frozen"],
            belongs: [{ name: "type", setName: "expenseTypes" }, "wallet", "employee"]
        }, {
            name: "expenseTypes",
            properties: ["name", "orderNumber", "deleted", "unitName", "categoryID", "price", "walletName", "defaultWalletID", "walletEditable", "forSalary"],
            belongs: [{ name: "category", setName: "expenseCategories", fkProperty: "categoryID" }],
            hasMany: [{ name: "expensePrices" }]
        }, {
            name: "expenseCategories",
            className: "expenseCategory",
            properties: ["name", "orderNumber", "deleted"],
            hasMany: [{ name: "expenseTypes", fkProperty: "categoryID" }]
        }, {
            name: "expensePrices",
            properties: ["comments", "employeeID", "expenseTypeID", "value"],
            belongs: [{ name: "expenseType" }]
        }, {
            name: "users",
            properties: ["name", "surname", "patronymic", "roleID", "blocked", "deleted"]
        }, {
            name: "wallets",
            mode: "expenses",
            properties: ["name", "orderNumber", "deleted", "typeID"],
            hasMany: ["employeeWallets", { name: "walletFromRatios", setName: "walletRatios", fkProperty: "walletFromID" }, { name: "walletToRatios", setName: "walletRatios", fkProperty: "walletToID" }]
        }, {
            name: "walletRatios",
            properties: ["walletFromID", "walletToID", "ratio", "walletToName"]
        }, {
            name: "transfers",
            properties: ["walletFromID", "walletToID", "ratio", "walletToName", "walletFromName", "date", "amountSent", "amountReceived", "comments", "frozen"],
            belongs: [{ name: "walletFrom", setName: "wallets" }, { name: "walletTo", setName: "wallets" }],
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "employee") {
            e.ko.include(["position", "department", "expensePrices"]);
            ko.toDobs(e.ko.lastSalary);
            e.ko.balance = ko.obs(e.ko.balance());
            e.ko.fullName = ko.cmp({
                read: function () { return [e.ko.surname(), e.ko.name(), e.ko.patronymic()].join(" ").trim(); },
                write: function (value) {
                    var parts = value.split(" ");
                    if (parts.length == 1) {
                        e.ko.name(parts[0]);
                        e.ko.surname("");
                    } else {
                        e.ko.surname(parts[0]);
                        e.ko.name(parts[1]);
                    }
                    e.ko.patronymic(parts[2]);
                }
            });

            e.ko.archived.subscribe(function (newValue) {
                if (newValue) {
                    e.ko.archiveDate((new Date()).toSds());
                } else {
                    e.ko.archiveDate("");
                }
            });
            e.ko.archiveDate.subscribe(function (newValue) {
                if (newValue) {
                    e.ko.archived(true);
                } else {
                    e.ko.archived(false);
                }
            });

            e.ko.disabled = ko.cmp(function () {
                return e.ko.archived() && (isEmpty(e.ko.archiveDate()) || parseDate(e.ko.archiveDate()) <= new Date())
            });

            if (e.ko.id() < 0) {
                var dep = koModel.departments().first("val=>!val.deleted()");
                e.ko.departmentID(dep ? dep.id() : "");

                var position = koModel.activePositions(e.ko).first();
                e.ko.positionID(position ? position.id() : "");
            }

        } else if (e.className == "department") {
            e.ko.include(["positions", "employees"]);
            e.ko.rowsVisible = ko.obs(false);
        } else if (e.className == "expensePrice") {
            e.ko.include("expenseType");
            ko.toDobs(e.ko.value);
            e.ko.expenseTypeID.subscribe(function (value) {
                var type = e.ko.expenseType();
                if (e.ko.entity.inParse || !type)
                    return;
                e.ko.value(type.price());
            });
        } else if (e.className == "expenseCategory") {
            e.ko.include("expenseTypes");
        } else if (e.className == "expense") {
            e.ko.readOnly = ko.obs(e.ko.readOnly() || e.ko.frozen() && host.ur != host.roles.admin);
        } else if (e.className == "transfer") {
            e.ko.readOnly = ko.obs(e.ko.frozen() && host.ur != host.roles.admin);
        }
    });

    koModel.employeeID = data.employee.id;
    model.refreshData(data);
    model.employees.addData([data.employee]);
    model.toKo(koModel);
    koModel.getModel = function () { return model; };
    koModel.wallets().forEach(function (it) {
        it.forExpenses = ko.obs(true);
    });
    koModel.employee = koModel.employees().first();
    koModel.monthes = ko.obsa($.datepicker.regional['ru'].monthNames.select(function (it, i) {
        var result = {
            id: i + 1,
            name: it
        };

        return result;
    }));

    koModel.filter.year(data.year);
    koModel.filter.month(data.month);
    koModel.years(data.years);
    koModel.filter.month.subscribe(function () {
        koModel.refresh();
    });
    koModel.filter.year.subscribe(function () {
        koModel.refresh();
    });

    koModel.selectTab = function (row) {
        var oldTab = koModel.itabs().first("val=>val.id=='" + koModel.selected.itabID() + "'");
        var valid = true;
        if (oldTab) {
            $("form").each(function (it) { valid = valid & $(this).valid(); });
        }
        valid = valid;
        if (valid) {
            koModel.updateAll(function () {
                if (row.url) {
                    var url = row.url.replace("{0}", koModel.employeeID);
                    window.location = url;
                    return;
                }

                koModel.selected.itabID(row.id);
                koModel.refresh();
                koModel.setHeight();
            }, "");
        }
    };

    koModel.refresh = function (time) {
        if (koModel.hasChanges()) {
            if (time === 1) {
                return;
            }
            koModel.updateAll(function () { koModel.refresh(1); }, "");
            return;
        }
        if (koModel.selected.itabID() == 1) {
            koModel.expensesKoModel.refresh();
        } else if (koModel.selected.itabID() == 2) {
            koModel.incomesKoModel.refresh();
        } else if (koModel.selected.itabID() == 3) {
            koModel.transfersKoModel.refresh();
        }
    };

    koModel.refreshBalance = function () {
        $.rjson({
            url: host.arp + "Employee/BalanceJson/" + koModel.employee.id(),
            success: function (result) {
                result = toJsObject(result);
                koModel.employee.balance(result.balance);
            }
        });
    };

    koModel.createExpense = function () {
        koModel.expensesKoModel.expense.create();
    };

    koModel.createExpensePrice = function () {
        koModel.expensePricesKoModel.expensePrice.create();
    };

    koModel.createIncome = function () {
        koModel.incomesKoModel.income.create();
    };

    koModel.createTransfer = function () {
        koModel.transfersKoModel.transfer.create();
    };

    koModel.activeDepartments = function () {
        return koModel.departments().where(function (it) { return !it.deleted() || it.id() == koModel.employee.departmentID(); }).orderBy("val=>val.orderNumber()");
    };

    koModel.activePositions = function () {
        var department = koModel.employee.department();
        return department.positions().where(function (it) { return (!department.deleted() && !it.deleted()) || it.id() == koModel.employee.positionID(); }).orderBy("val=>val.orderNumber()");
    };

    koModel.updateAll = function (callback, showQtip) {
        var valid = true;
        $("form").each(function (it) { valid = valid & $(this).valid(); });
        if (!valid)
            return false;

        if (typeof koModel.valid == "function") {
            if (!koModel.valid()) {
                return;
            }
        }
        
        top.busy("UpdateEmployee");

        model.update(function (result) {
            koModel.refreshBalance();
            top.free("UpdateEmployee");

            if (showQtip == false || result.canceled.any()) {
            } else if (showQtip == true || result.changes.updated.any() || result.changes.deleted.any()) {
                window.showTip("Данные успешно сохранены");
            }

            if (typeof callback == "function") {
                callback(result);
            }
        });
        return true;
    };

    koModel.valid = function () {
        var first = koModel.expenses().first("val=>!val.walletID()");
        if (first) {
            ejs.alert("Необходимо заполнить кошелек для всех расходов!");
            koModel.expensesKoModel.expense.current(first);
            return false;
        }
        return true;
    };

    koModel.loadUsers = function (request, callback, row) {
        var name = row.userLogin().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var items = filter.length <= 2 ? koModel.users().where("val=>!val.deleted()&&!val.blocked()&&val.login().contains('" + filter + "',1)") : [];//&&val.roleID()==4
        if (items.length > 10) {
            var items = items.orderBy("val=>val.login().toLowerCase()").select(function (item) {
                return { label: item.login(), value: item.login(), source: item };
            });
            callback(items);
        } else {
            var where = [];
            var w = ejs.cwp("group", false, "==", "group");
            w.SubParameters = [ejs.cwp("deleted", false, "==", "bool"), ejs.cwp("blocked", false, "==", "bool")];//, ejs.cwp("roleID", 4, "==", "number")
            if (row.userID() > 0) {
                w.SubParameters.push(ejs.cwp("id", row.userID(), "==", "number", "or"));
            }
            where.push(w);

            if (filter) {
                var w = ejs.cwp("login", "%" + filter + "%", "like", "string");
                where.push(w);
            }

            model.users.select(function (collection, result) {
                var items = result.select(function (item) { return { label: item.login, value: item.login, source: item }; });
                callback(items.orderBy("val=>val.label.toLowerCase()"));
            }, where, [ejs.cop("login")], 20, "", "", "", "", false);
        }
    };

    koModel.selectPhoto = function (name) {
        var frm = $("#frmUploadPhoto");
        var txt = frm.contents().find("input[type=file]");
        txt.click();
    };

    ko.apply(koModel);
});