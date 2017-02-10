var koModel = {
    itabs: ko.obsa([{
        id: 1,
        frmID: "frmProject",
        name: "информация",
        url: host.arp + "Project/Index/{0}"
    }, {
        id: 3,
        frmID: "frmTasks",
        name: "задачи",
        url: host.arp + "Project/Tasks/{0}"
    }, {
        id: 2,
        frmID: "frmExpenses",
        name: "расходы",
        url: host.arp + "Project/Index/{0}#frmExpenses"
    }, {
        id: 4,
        frmID: "frmBills",
        name: "счета",
        url: host.arp + "Project/Index/{0}#frmBills"
    }, {
        id: 5,
        frmID: "frmSalary",
        name: "начисления",
        url: host.arp + "Project/Payrolls/{0}",
        selected: true
    }, {
        id: 6,
        frmID: "frmFinances",
        name: "финансы",
        url: host.arp + "Project/Index/{0}#frmFinances"
    }, {
        id: 9,
        frmID: "frmFiles",
        name: "файлы",
        url: host.arp + "Project/Index/{0}#frmFiles"
    }]),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = toJsObject(data);
    var model = initModel(koModel, data);

    koModel.projectID = data.project.id;
    model.projects.refreshData([data.project]);
    model.toKo(koModel);
    koModel.project = koModel.projects().first();
    model.addData(data);

    koModel.itabs().forEach(function (row) {
        if (row.url) {
            row.url = row.url.replace("{0}", koModel.projectID);
        }
    });
    koModel.getModel = function () { return model; };

    koModel.updateAll = function (callback, showQtip) {
        var valid = true;
        $("tab-content form").each(function (it) { valid = valid & $(this).valid(); });

        if (!valid) {
            return false;
        }

        if (typeof koModel.valid == "function") {
            if (!koModel.valid()) {
                return;
            }
        }

        top.busy("UpdateProject");

        model.update(function (result) {
            top.free("UpdateProject");
            var changes = result.changes.updated.any() || result.changes.deleted.any();
            if (showQtip == false || result.canceled.any()) {
            } else if (showQtip == true || changes) {
                window.showTip("Данные успешно сохранены");
            }

            if (typeof callback == "function") {
                callback(result);
            }

            if (changes) {
                model.projects.getByID(koModel.projectID, function () { })
            }
        });
        return true;
    };

    koModel.loadEmployees = function (request, callback, row) {
        var name = row.employeeName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.employees, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.employees.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.setHeight = function () {
        $("div.line").css({ height: 0, paddingTop: 0 });
        var h = $(window).height() - 200;

        $(".container .tab-content").each(function () {
            var frm = $(this);
            var frmh = frm.height();

            if (frmh < h) {
                frm.css("min-height", h + "px");
            }
        });
    };

    initPayrolls(koModel, model, data);

    ko.apply(koModel);

    koModel.setHeight();
    $(window).resize(function () {
        koModel.setHeight();
        //koModel.setWidth();
    });

});

function initModel(koModel, data) {
    var model = new ejs.model({
        sets:
        [{
            name: "projects",
            mode: "details",
            properties: data.projectProperties.select("val=>ejs.toJsName(val)"),
            belongs: ["contractor", { name: "subcontractor", setName: "contractors" }, "contract", { name: "responsible", setName: "users", fkProperty: "responsibleID" }],
            hasMany: ["projectFiles", "contracts", { name: "stages", setName: "projectStages" }, { name: "works", setName: "projectWorks" }, { name: "allPayments", setName: "payments" }]
        }, {
            name: "payrolls",
            properties: ["amount", "date", "employeeID", "projectID", "employeeName", "month", "comments", "frozen"]
        }, {
            name: "employees",
            properties: ["surname", "name", "patronymic", "deleted", "walletID", "walletName", "fullName"]
        }, {
            name: "refbooks",
            properties: ["comments", "name", "deleted", "orderNumber", "typeID"],
            hasMany: [{ name: "stages", setName: "workStages", fkProperty: "categoryID" }]
        }, {
            name: "statbooks",
            properties: ["comments", "name", "orderNumber", "typeID", "color"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "project") {

        } else if (e.className == "payroll") {
            e.ko.readOnly = ko.obs(e.ko.frozen() && host.ur != host.roles.admin);
            e.ko.deletable = ko.obs(!e.ko.readOnly());
        }
    });
    model.events.updated.attach(function (e) {
        if (e.model.hasChanges())
            return;
    });

    koModel.activeUsers = function (id) {
        var users = koModel.users();
        users = users.where(function (it) {
            return (!it.deleted() && !it.blocked() /*&& it.roleID() > 1 && it.roleID() < 4*/) || it.id() == id;
        }).orderBy("val=>val.fullName()");
        return users;
    };

    return model;
};

function initPayrolls(koModel, model, data) {
    koModel.months = $.datepicker._defaults.monthNames.select(function (it, i) { return { id: ko.obs(i + 1), name: ko.obs(it) }; });

    ejs.crud.getDefaultTextProvider = function (options) {
        var provider = new ejs.crud.defaultTextProvider();
        provider.unableDelete = "Вы не можете удалить эту запись!";
        return provider;
    };

    var sn = "/Project/Payrolls#tblPayrolls";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.payrollsCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.payrolls,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divPayrolls"),
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: -1,
        pure: true,
        excel: "Начисления",
        columns:
        [{
            title: "Сотрудник",
            name: "employeeID",
            orderBy: "employee.FullName",
            value: "employeeName",
            type: "autocomplete",
            method: "loadEmployees",
            disable: "readOnly",
            required: true,
            filterName: "employee.FullName",
            filter: true
        }, {
            title: "Дата",
            name: "date",
            type: "date",
            disable: "readOnly",
            filter: true
        }, {
            title: "Сумма",
            name: "amount",
            type: "number",
            disable: "readOnly",
            filter: true
        }, {
            title: "За месяц",
            name: "month",
            value: "month()?$root.months[month() - 1].name():\"\"",
            defaultValue: new Date().getMonth(),
            type: "select",
            options: "months",
            disable: "readOnly",
            filter: true
        }, {
            title: "Примечание",
            name: "comments",
            type: "textarea",
            disable: "readOnly",
            filter: true
        }],
        filters: [{
            property: "projectID",
            value: koModel.project.id(),
            type: "number"
        }]
    });
    koModel.payrollsCrud.events.created.attach(function (e) {
        var row = e.row;
        e.row.projectID(koModel.project.id());
    });

    koModel.payrollsCrud.events.editing.attach(function (e) {
        var btn = koModel.payrollsCrud.getEditor().getDialog().parent().find("div.ui-dialog-buttonset button:first");
        if (e.row.readOnly()) {
            btn.hide();
        } else {
            btn.show();
        }
    });

    if (!cols) {
        koModel.payrollsCrud.getPager().refresh();
    }
};