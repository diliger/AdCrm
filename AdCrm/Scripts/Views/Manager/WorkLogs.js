var koModel = {
    filter: {
        year: ko.obs(""),
        month: ko.obs(""),
        project: ko.obs(""),
        visible: ko.obs(false),
        departments: { ids: ko.obsa([]) },
        positions: { ids: ko.obsa([]) },
        employees: { ids: ko.obsa([]) }
    },
    years: ko.obsa([]),
    months: ko.obsa([]),
    workLog: {
        selectedArray: ko.obsa([])
    },
    grid: {
        name: "/Manager/WorkLogs#tblWorkLogs",
        save: function () {
            var value = $("#tblWorkLogs").koGrid("getColumns");
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
            name: "workLogs",
            properties: ["comments", "createDate", "date", "employeeID", "hours", "projectID", "projectName"],
            belongs: [{ name: "employee" }, { name: "project"}]
        }, {
            name: "projects",
            properties: ["name", "address"]
        }, {
            name: "departments",
            properties: ["comments", "name", "managerID", "orderNumber", "deleted"],
            hasMany: [{ name: "positions" }, { name: "employees"}]
        }, {
            name: "positions",
            properties: ["comments", "name", "deleted", "departmentID", "orderNumber"],
            belongs: [{ name: "department"}],
            hasMany: [{ name: "employees"}]
        }, {
            name: "employees",
            properties: ["comments", "createDate", "departmentID", "surname", "name", "patronymic", "positionID", "deleted"],
            belongs: [{ name: "position" }, { name: "department"}]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "workLog") {
            e.ko.include(["employee", "project"]);
            if (e.ko.id() < 0) {
                var date = new Date();
                date.setDate(1);
                date.setMonth(koModel.filter.month() - 1);
                date.setYear(koModel.filter.year());
                e.ko.date(date.toSds());
                e.ko.hours(0);
            }
            e.ko.departmentID = ko.obs(e.ko.employee() ? e.ko.employee().departmentID() : "");
            e.ko.positionID = ko.obs(e.ko.employee() ? e.ko.employee().positionID() : "");
            e.ko.departmentID.subscribe(function (value) {
                var position = koModel.activePositions(e.ko).first();
                e.ko.positionID(position ? position.id() : "");
            });
            e.ko.positionID.subscribe(function (value) {
                var employee = koModel.activeEmployees(e.ko).first();
                e.ko.employeeID(employee ? employee.id() : "");
            });

            e.ko.hoursTotal = ko.cmp(function () {
                var employee = e.ko.employee();
                if (employee) {
                    var departmentID = e.ko.departmentID();
                    var projectID = e.ko.projectID()
                    return koModel.workLogs().where("val=>val.employee() && val.employee().departmentID()=='" + departmentID + "'&&val.projectID()=='" + projectID + "'").sum("val=>val.hours()*1");
                }
                else {
                    return "Выберите сотрудника";
                }
            });

        } else if (e.className == "department") {
            e.ko.include(["positions", "employees"]);
        } else if (e.className == "position") {
            e.ko.include(["department", "employees"]);
        } else if (e.className == "employee") {
            e.ko.include(["position", "department"]);
            e.ko.fullName = ko.cmp({ read: function () { return [e.ko.surname(), e.ko.name(), e.ko.patronymic()].join(" ").trim(); },
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

    koModel.filter.month.subscribe(function () {
        koModel.refresh();
    });
    koModel.filter.year.subscribe(function () {
        koModel.refresh();
    });

    koModel.filter.departments.items = ko.cmp(function () {
        return koModel.filter.departments.ids().select(function (it) { return koModel.departments().first("val=>val.id()==" + it); });
    });
    koModel.filter.positions.items = ko.cmp(function () {
        return koModel.filter.positions.ids().select(function (it) { return koModel.positions().first("val=>val.id()==" + it); });
    });
    koModel.filter.employees.items = ko.cmp(function () {
        return koModel.filter.employees.ids().select(function (it) { return koModel.employees().first("val=>val.id()==" + it); });
    });

    koModel.filter.departments.positions = ko.cmp(function () {
        var result = [];
        if (koModel.filter.departments.ids().any()) {
            result = koModel.filter.departments.items().selectMany(function (val) { return val.positions(); }).distinct().orderBy("val=>val.orderNumber()");

            //koModel.filter.positions.ids([]);
            //var old = koModel.filter.positions.ids().where(function (it) { return !result.any("val=>val.id()=='" + it + "'"); });
            //old.forEach(function (it) { koModel.filter.positions.ids.remove(it); });
        } else {
            result = koModel.positions().orderBy("val=>val.orderNumber()");
        }
        return result;
    });
    koModel.filter.positions.employees = ko.cmp(function () {
        var result = [];
        if (koModel.filter.positions.ids().any()) {
            result = koModel.filter.positions.items().selectMany(function (val) { return val.employees(); }).distinct().orderBy("val=>val.fullName()");

            //koModel.filter.employees.ids([]);
            //var old = koModel.filter.employees.ids().where(function (it) { return !result.any("val=>val.id()=='" + it + "'"); });
            //old.forEach(function (it) { koModel.filter.employees.ids.remove(it); });
        } else if (koModel.filter.departments.ids().any()) {
            result = koModel.filter.departments.items().selectMany(function (val) { return val.employees(); }).distinct().orderBy("val=>val.fullName()");
        }
        else {
            result = koModel.employees().orderBy("val=>val.fullName()");
        }
        return result;
    });
    koModel.filter.departments.ids.subscribe(function () { koModel.filter.positions.ids([]); });
    koModel.filter.positions.ids.subscribe(function () { koModel.filter.employees.ids([]); });

    koModel.pager = new ejs.remotePager({
        set: model.workLogs,
        model: model,
        //pageSize: 20,
        compressPages: true,
        whereMethod: "FilterWorkLogs",
        filters: [{
            property: "year",
            value: koModel.filter.year,
            type: "number"
        }, {
            property: "month",
            value: koModel.filter.month,
            type: "number"
        }, {
            property: "departments",
            value: function () { return koModel.filter.departments.ids().join(","); },
            type: "string"
        }, {
            property: "positions",
            value: function () { return koModel.filter.positions.ids().join(","); },
            type: "string"
        }, {
            property: "employees",
            value: function () { return koModel.filter.employees.ids().join(","); },
            type: "string"
        }],
        includes: [ejs.cip(model.projects)]
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.activeDepartments = function (row) {
        return koModel.departments().where(function (it) { return !it.deleted() || it.id() == row.departmentID(); });
    };

    koModel.activePositions = function (row) {
        var department = koModel.departments().first("val=>val.id()=='" + row.departmentID() + "'");
        return department ? department.positions().where(function (it) { return !it.deleted() || it.id() == row.positionID(); }) : [];
    };

    koModel.activeEmployees = function (row) {
        var position = koModel.positions().first("val=>val.id()=='" + row.positionID() + "'");
        return position ? position.employees().where(function (it) { return !it.deleted() || it.id() == row.employeeID(); }) : [];
    };

    koModel.loadProjects = function (request, callback, row) {
        var projectName = row.project() ? row.project().name().toLowerCase() : "";
        
        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == projectName ? "" : filter;

        koModel.filter.project(filter);


        if (filter.length <= 2 && koModel.projects().where("val=>val.name().contains('" + filter + "',1)").length > 10) {

            var items = koModel.projects().where("val=>val.name().contains('" + filter + "',1)").orderBy("val=>val.name().toLowerCase()").select(function (item) {
                return { label: item.name() + (item.address() ? ", " + item.address() : ""), value: item.name(), source: item };
            });

            if (typeof callback == "function") {
                callback(items);
            } else {
                return items;
            }
        } else {
            var where = ejs.cwp("group", "%" + filter + "%", "like", "group", "or");
            where.SubParameters = [ejs.cwp("name", "%" + filter + "%", "like", "string", "or"), ejs.cwp("address", "%" + filter + "%", "like", "string", "or")];
            model.projects.select(function (collection, result) {
                var items = result.allEntities.select(function (item) { return { label: item.name(), value: item.name(), source: item }; });// + (item.address() ? ", " + item.address() : "")

                if (typeof callback == "function") {
                    callback(items.orderBy("val=>val.label.toLowerCase()"));
                } else {
                    return items;
                }
            }, filter ? [where] : "", [ejs.cop("name")], 20);
        }
    };

    koModel.updateAll = function (callback) {
        top.busy("UpdateWorkLogs");
        model.update(function () {
            top.free("UpdateWorkLogs");
            if (typeof callback == "function") {
                callback();
            }
        });
    };

    koModel.refresh = function () {
        koModel.workLog.selectedArray([]);
        koModel.updateAll(function () {
            koModel.pager.goTo(0);
        });
    };

    koModel.workLog.selectedTotal = ko.cmp(function () {
        var workLogs = koModel.workLog.selectedArray().select(function (it) { return koModel.workLogs().first("val=>val.id()==" + it); });
        return workLogs.sum("val=>val.hours()*1");
    });

    koModel.workLog.create = function () {
        var workLog = model.workLogs.create();
    };

    koModel.workLog.remove = function (workLog) {
        var workLogs = [];
        if (workLog.entity) {
            koModel.workLog.selectedArray([]);
            workLogs.push(workLog);
        } else {
            workLogs = koModel.workLog.selectedArray().select(function (it) { return koModel.workLogs().first("val=>val.id()==" + it); });
        }

        var names = ["запись", "записи", "записей"];
        var message = ["Вы действительно хотите удалить ",
                       workLogs.length == 1 ? names[0] + " по проекту " + workLogs[0].projectName() : workLogs.length + " " + i18n.declineCount(workLogs.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (workLogs.length == 0 || (workLogs.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }

        koModel.workLog.selectedArray([]);

        workLogs.forEach(function (it) {
            it.entity.remove();
        });
        koModel.updateAll();
    };

    koModel.toExcel = function () {
        var workLogs = koModel.workLogs();
        if (koModel.workLog.selectedArray().any()) {
            workLogs = koModel.workLog.selectedArray().select(function (it) { return workLogs.first("val=>val.id()==" + it); }); ;
        }
        var headers = ["Отдел", "Проект", "Должность", "Сотрудник", "Примечание", "Часов по проекту", "Часов по проекту по отделу"];
        var name = ["Учет_рабочего_времени_", koModel.filter.year(), "_", koModel.filter.month()].join("");
        var rows = workLogs.select(function (it) {
            var e = it.employee();
            return [e ? e.department().name() : "", it.projectName(), e ? e.position().name() : "", e ? e.fullName() : "", it.comments(), it.hours(), it.hoursTotal()];
        });
        $.rjson({ url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
            if (result.Success) {
                window.location = result.Url;
            }
        }
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

    $("#tblWorkLogs").koGrid({
        koTemplateID: "trWorkLog",
        headerContainer: $("#divWorkLogsHeader"),
        styleID: "stlWorkLogsGrid",
        tableID: "tblWorkLogs",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        //source: koModel.project.rows,
        disallowSort: ["Save", "Select", "HoursTotal"]
    });

    var setHeight = function () {
        var elements = $("[autoheight]").toArray();
        var groups = elements.select("val=>$(val).attr('autoheight')").distinct();
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var elems = elements.where("val=>$(val).attr('autoheight')=='" + group + "'");
            var height = elems.max("val=>$(val).height()");
            elems.forEach(function (it) { $(it).height(height); });
        }
    };

    ko.apply(koModel);

    setHeight();

    koModel.pager.goTo(0);
});
