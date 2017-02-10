var koModel = {
    filter: {
        text: ko.obs(""),
        archived: ko.obs(false)
    },
    employee: {
        inserted: ko.obs(null),
        selected: ko.obs(null),
        selectedArray: ko.obsa([])
    },
    grid: $.fn.koGrid.getSaveSettingsObject("/Manager/Employees#tblEmployees", "tblEmployees"),
    //dialog: { employee: { result: ko.obs(""), id: "#divContractorDialog"} },
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "employees",
            properties: ["comments", "createDate", "departmentID", "surname", "name", "patronymic", "positionID", "departmentName", "salaryChangeDate", "lastSalary", "deleted", "archived", "archiveDate", "balance",
            "passportIssueDate", "passportIssuer", "passportNumber", "passportSerie", "addressLive", "addressRegistration", "phone", "userID", "userLogin", "salaryBalance"],
            belongs: [{ name: "position" }, { name: "department" }]
        }, {
            name: "departments",
            properties: ["comments", "name", "deleted", "orderNumber"],
            hasMany: [{ name: "employees" }, { name: "positions" }]
        }, {
            name: "positions",
            properties: ["comments", "name", "deleted", "departmentID", "orderNumber"],
            hasMany: [{ name: "employees" }]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "employee") {
            e.ko.include(["position", "department"]);
            ko.toDobs(e.ko.lastSalary);
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

            if (e.ko.id() < 0) {
                var dep = koModel.departments().first("val=>!val.deleted()");
                e.ko.departmentID(dep ? dep.id() : "");

                var position = koModel.activePositions(e.ko).first();
                e.ko.positionID(position ? position.id() : "");
            }

            e.ko.flfullName = ko.cmp(function () {
                return z.filter.markMatches(e.ko.fullName(), koModel.filter.text());
            });

            e.ko.fluserLogin = ko.cmp(function () {
                return z.filter.markMatches(e.ko.userLogin(), koModel.filter.text());
            });

            e.ko.flposition = ko.cmp(function () {
                return z.filter.markMatches(e.ko.position() ? e.ko.position().name() : "", koModel.filter.text());
            });

            e.ko.fldepartmentName = ko.cmp(function () {
                return z.filter.markMatches(e.ko.department() ? e.ko.department().name() : "", koModel.filter.text());
            });
        } else if (e.className == "department") {
            e.ko.include(["positions", "employees"]);
            e.ko.rowsVisible = ko.obs(false);
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.pager = new ejs.remotePager({
        set: model.employees,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: [{
            property: "deleted",
            value: false,
            type: "bool"
        }, {
            property: "archived",
            value: koModel.filter.archived,
            type: "bool"
        }, {
            value: function () { return isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%"; },
            condition: "like", type: "group", property: "group", innerOperand: "or",
            filters: ["name", "surname", "patronymic", "position.Name", "user.Login", "user.Surname", "user.Name", "user.Patronymic"]
        }]
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
            if (koModel.filter.text()) {
                koModel.departments().forEach(function (it) {
                    it.rowsVisible(true);
                });
            }
        }
    });

    koModel.activeDepartments = function (row) {
        return koModel.departments().where(function (it) { return !it.deleted() || it.id() == row.departmentID(); });
    };

    koModel.activePositions = function (row) {
        return row.department() ? row.department().positions().where(function (it) { return !it.deleted() || it.id() == row.positionID(); }) : [];
    };

    koModel.updateAll = function (callback) {
        var employee = koModel.employee.selected();
        if (employee) {
            employee.entity.commit();
        }

        top.busy("UpdateEmployees");
        model.update(function () {
            top.free("UpdateEmployees");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    koModel.restoreAll = function () {
        var employee = koModel.employee.selected();
        if (employee) {
            if (employee.id() > 0) {
                employee.entity.restore();
            } else {
                employee.entity.remove();
            }
        }
    };

    koModel.filter.text.subscribe(function () {
        koModel.refresh();
    });

    koModel.filter.archived.subscribe(function () {
        koModel.refresh();
    });

    koModel.loadAll = function () {
        koModel.pager.setting.pageSize = -1;
        koModel.pager.refresh();
    };

    koModel.refresh = function () {
        koModel.pager.goTo(0);
    };

    koModel.employee.edit = function (employee) {
        if (!employee) {
            return;
        }

        window.location = ApplicationRootPath + "Employee/Index/" + employee.id();
    };

    koModel.employee.create = function () {
        var employee = new model.employee();//s.create();
        koModel.employee.inserted(employee.toKo());
        $("#divEmployee").dialog("open");
    };

    koModel.employee.cancel = function () {
        //koModel.project.inserted().entity.remove();
        koModel.employee.inserted(null);
        $("#divEmployee").dialog("close");
    };

    koModel.employee.update = function () {
        if (!$("#frmEmployee").valid()) {
            return;
        }
        koModel.employee.inserted().id(model.getMinID());
        model.employees.insert(koModel.employee.inserted().entity);
        koModel.updateAll(function () {
            koModel.employee.edit(koModel.employee.inserted());
        });
        $("#divEmployee").dialog("close");
    };

    koModel.employee.remove = function (employee) {
        var employees = [];
        if (employee.entity) {
            koModel.employee.selectedArray([]);
            employees.push(employee);
            //koModel.employee.selectedArray.push(employee.id());
        } else {
            employees = koModel.employee.selectedArray().select(function (it) { return koModel.employees().first("val=>val.id()==" + it); });
        }

        var names = ["сотрудника", "сотрудника", "сотрудников"];
        var message = ["Вы действительно хотите удалить ",
                       employees.length == 1 ? names[0] + " " + employees[0].fullName() : employees.length + " " + i18n.declineCount(employees.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (employees.length == 0 || (employees.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }
        employees.forEach(function (it) {
            if (it.id() > 0) {
                it.deleted(true);
            } else {
                it.entity.remove();
            }
        });
        koModel.updateAll(function () {
            employees.forEach(function (it) {
                it.entity.detach();
            });
            koModel.employee.selectedArray([]);
        });
    };

    koModel.searchKeyPress = function (data, event) {
        if (event.keyCode == 13 || event.which == 13) {
            var element = $(event.target);
            setTimeout(function () {
                element.change();
                koModel.refresh();
            }, 100);
        }
        return true;
    };

    koModel.toExcel = function () {
        var employees = koModel.employees();
        if (koModel.employee.selectedArray().any()) {
            employees = koModel.employee.selectedArray().select(function (it) { return employees.first("val=>val.id()==" + it); });;
        }
        var headers = ["Отдел", "ФИО", "Должность", "ЗП", "Дата изменения", "Уволен", "Дата увольнения", "Примечание"];

        var name = ["Сотрудники_", (new Date()).toSds()].join("");
        var rows = employees.select(function (it) {
            return [it.department().name(), it.fullName(), it.position().name(), it.lastSalary(), it.salaryChangeDate(), it.archived(), it.archiveDate(), it.comments()];
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

    $("#tblEmployees").koGrid({
        koTemplateID: "trEmployee",
        headerContainer: $("#divEmployeesHeader"),
        styleID: "stlEmployeesGrid",
        tableID: "tblEmployees",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        //source: koModel.project.rows,
        disallowSort: ["Save", "Select", "LastSalary", "SalaryChangeDate", "Balance"]
    });

    $("#divEmployee").dialog({
        autoOpen: false,
        draggable: true,
        resizable: false,
        modal: true,
        width: 550
    });

    $("#frmEmployee").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement
    });

    ko.apply(koModel);

    koModel.pager.goTo(0);
    loadHtml();
});

function loadHtml() {
    //    $.ajax({
    //        url: ApplicationRootPath + "Contractor/Details",
    //        data: { date: new Date() },
    //        success: function (result) {

    //            var div = $(koModel.dialog.employee.id);
    //            div.html(result);

    //            div.dialog({
    //                title: "Информация по контрагенту",
    //                width: 660,
    //                buttons: [
    //            { text: 'OK', click: function () { if (!div.find("form").valid()) return; koModel.dialog.employee.close(true); } },
    //            { text: 'Отмена', click: function () { koModel.dialog.employee.close(false); } }
    //        ],
    //                modal: true,
    //                autoOpen: false,
    //                open: function () { koModel.dialog.employee.result(""); div.dialog({ title: koModel.filter.role() == 1 ? "Информация по заказчику" : "Информация по подрядчику" }); },
    //                close: function () {
    //                    if (typeof koModel.dialog.employee.onClosed == "function") {
    //                        koModel.dialog.employee.onClosed();
    //                    }
    //                }
    //            });

    //            ko.apply(koModel, div.get(0));
    //        }
    //    });

}