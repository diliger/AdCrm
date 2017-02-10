var koModel = {
    filter: {
        year: ko.obs(""),
        month: ko.obs("")
    },
    years: ko.obsa([]),
    months: ko.obsa([]),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "payrolls",
            properties: ["amount", "date", "employeeID", "projectID", "employeeName", "month", "comments", "projectName", "frozen"],
            belongs: ["project", "employee"]
        }, {
            name: "projects",
            properties: ["name", "deleted", "archived"]
        }, {
            name: "employees",
            properties: ["surname", "name", "patronymic", "deleted", "walletID", "walletName", "fullName"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "payroll") {
            e.ko.readOnly = ko.obs(e.ko.frozen() && host.ur != host.roles.admin ? true : false);
            e.ko.deletable = ko.obs(!e.ko.readOnly());
        }
    });

    model.refreshData(data);
    model.toKo(koModel);
    //koModel.getModel = function () { return model; };
    koModel.filter.year(data.year);
    koModel.filter.month(data.month);
    koModel.years(data.years);
    koModel.months(data.months.where("val=>val").select(function (it, i) {
        var result = {
            name: ko.obs(it),
            id: ko.obs(i + 1)
        };

        return result;
    }));

    koModel.refresh = function () {
        koModel.payrollsCrud.refresh();
    };

    koModel.years().forEach(function (it) {
        it.total = it.months.sum("val=>val.total*1");
    });

    koModel.filter.month.subscribe(function () {
        koModel.refresh();
    });
    koModel.filter.year.subscribe(function () {
        koModel.refresh();
    });

    koModel.updateTotal = function () {
        $.rjson({
            url: ApplicationRootPath + "Payrolls/TotalJson",
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
        if (!koModel.hasChanges()) {
            if (typeof callback == "function") {
                callback();
            }
            return;
        }

        if (typeof koModel.valid == "function") {
            if (!koModel.valid()) {
                return;
            }
        }

        top.busy("UpdatePayrolls");
        model.update(function () {
            top.free("UpdatePayrolls");
            if (typeof callback == "function") {
                callback();
            }
            koModel.updateTotal();
        });
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

    koModel.loadProjects = function (request, callback, row) {
        var name = row.projectName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool"), ejs.cwp("parentID", true, "isNull", "number")];
        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.projects, where, [ejs.cop("name")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.projects.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };

    initPayrolls(koModel, model, data);

    ko.apply(koModel);
});


function initPayrolls(koModel, model, data) {
    //koModel.months = $.datepicker._defaults.monthNames.select(function (it, i) { return { id: ko.obs(i + 1), name: ko.obs(it) }; });
    ejs.crud.getDefaultTextProvider = function (options) {
        var provider = new ejs.crud.defaultTextProvider();
        provider.unableDelete = "Вы не можете удалить эту запись!";
        return provider;
    };

    var sn = "/Payrolls/Index#tblPayrolls";
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
        selectMany: true,
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        //pageSize: -1,
        pure: true,
        excel: "Начисления",
        columns:
        [{
            title: "Проект",
            name: "projectID",
            orderBy: "project.Name",
            value: "projectName",
            showTemplate: "<a data-bind=\"text: projectName, attr: { href: host.arp + 'Project/Index/' + projectID() }\" target=\"_blank\"></a>",
            type: "autocomplete",
            method: "loadProjects",
            disable: "readOnly()==true",
            required: true,
            filterName: "project.Name",
            filter: true
        }, {
            title: "Сотрудник",
            name: "employeeID",
            orderBy: "employee.FullName",
            value: "employeeName",
            showTemplate: "<a data-bind=\"text: employeeName, attr: { href: host.arp + 'Employee/Index/' + employeeID() }\" target=\"_blank\"></a>",
            type: "autocomplete",
            method: "loadEmployees",
            disable: "readOnly()==true",
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
            value: "month()?$root.months()[month() - 1].name():\"\"",
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
            property: "date",
            type: "date",
            condition: ">=",
            value: function () {
                var date = new Date();
                date.setDate(1);
                date.setMonth(koModel.filter.month() - 1);
                date.setYear(koModel.filter.year());
                return date.toSds();
            }
        }, {
            property: "date",
            type: "date",
            condition: "<=",
            value: function () {
                var date = new Date();
                date.setDate(1);
                date.setYear(koModel.filter.year());
                date.setMonth(koModel.filter.month());
                date.setDate(0);
                return date.toSds();
            }
        }]
    });
    koModel.payrollsCrud.events.created.attach(function (e) {
        var row = e.row;
        //e.row.projectID(koModel.project.id());
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