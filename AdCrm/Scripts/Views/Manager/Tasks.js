var koModel = {
    filter: { text: ko.obs("") },
    previousTask: ko.obs(),
    nextTask: ko.obs(),
    hideThePage: ko.obs(false),
    needRefresh: false
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = ejs.toJsObject(data);
    var model = initModel(koModel, data);
    model.addData(data);
    model.toKo(koModel);

    koModel.loadTaskTypes = function (request, callback, row, code) {
        var name = row.name().toLowerCase();
        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("Deleted", false, "==", "bool")];
        if (filter) {
            var w = ejs.cwp("group", "%" + filter + "%", "like", "group");
            w.SubParameters = code ? [ejs.cwp("code", "%" + filter + "%", "like", "string")] : [ejs.cwp("shortName", "%" + filter + "%", "like", "string"), ejs.cwp("shortName", true, "isNull", "", "or"), ejs.cwp("name", "%" + filter + "%", "like", "string", "and")];
            where.push(w);
        }

        var orders;
        if (code) {
            orders = [ejs.cop("Code")];
        } else {
            orders = [ejs.cop("ShortName"), ejs.cop("Name")];
        }
        var so = ejs.cso(model.taskTypes, where, orders, 20, "");

        model.select(so, function (result) {
            model.addData(result.collections);

            var items;
            items = result.collections.taskTypes.select(function (item) {
                var text = code ? item.code : (item.shortName || item.name);
                return { label: text, value: text, source: item };
            });
            callback(items);
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

    koModel.loadTasks = function (request, callback, row) {
        var name = row.previousName().toLowerCase();
        var project = row.project();
        var pIDs = [row.projectID(), (project ? project.parentID() : "")].where("val=>val>0").distinct();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var wprojects = [];
        pIDs.forEach(function (id) {
            wprojects.push(ejs.cwp("projectID", id, "=", "number", "or"), ejs.cwp("project.ParentID", id, "=", "number", "or"));
        });

        var where = [];
        if (wprojects.any())
            where.push(ejs.cwp("project", true, "", "group", "", "", wprojects));
        where.push(ejs.cwp("id", row.id(), "!=", "number"));
        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.projectTasks, where, [ejs.cop("name")], 20), function (result) {
            //model.addData(result.collections);
            callback(result.collections.projectTasks.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };

    koModel.loadProjects = function (request, callback, row) {
        var name = row.projectName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.projects, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result);
            callback(result.collections.projects.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    initProjectTasks(koModel, model, data);

    ko.apply(koModel);

    window.setSize = function () {
        var h = $(window).height();
        var div = $(".right-content .container");
        div.css({ height: h - 40 - div.offset().top + "px" });
    };

    setSize();
    $(window).resize(function () {
        setSize();
    });

});

function initModel(koModel, data) {
    var model = new ejs.model({
        sets:
        [{
            name: "projectTasks",
            properties: ["comments", "completed", "employeeID", "dateBegin", "typeID", "dateEnd", "createDate", "name", "dateEndPlan", "projectID", "orderNumber", "responsibleID", "employeeName", "statusText", "statusID", "message",
            "previousID", "previousName", "newMessage", "overdue", "projectName", "projectType"],
            belongs: ["project", { name: "responsible", setName: "users" }, { name: "status", setName: "statbooks" }, { name: "type", setName: "taskTypes" }],
            hasMany: [{ name: "messages", setName: "projectTaskMessages", fkProperty: "taskID" }]
        }, {
            name: "taskTypes",
            properties: ["comments", "deleted", "name", "shortName", "customerID", "orderNumber", "code", "unitName", "price", "customerName", "duration"]
        }, {
            name: "users",
            properties: ["fullName", "managerFee", "roleID", "deleted", "blocked"]
        }, {
            name: "projects",
            properties: ["fullName", "deleted", "parentName", "parentID"]
        }, {
            name: "projectTaskMessages",
            properties: ["text", "taskID", "creatorName", "createDate"]
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

        } else if (e.className == "projectTask") {
            e.ko.include(["responsible", "messages", "status", "project", "type"]);
            e.ko.dateBegin.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
            });
            e.ko.typeID.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
            });
            e.ko.statusName = ko.cmp(function () {
                return e.ko.status() ? e.ko.status().name() : "";
            });
            e.ko.responsibleName = ko.cmp(function () {
                return e.ko.responsible() ? e.ko.responsible().fullName() : "";
            });
            var flprops = ["projectName", "employeeName", "name", "statusName", "statusText", "responsibleName", "previousName", "message", "projectType"];

            flprops.forEach(function (it) {
                e.ko["fl" + it] = ko.cmp({
                    read: function () {
                        return z.filter.markMatches(e.ko[it](), koModel.filter.text());
                    }, write: function (val) {
                        if (typeof e.entity[it] != "undefined")
                            e.ko[it](val);
                    }
                });
            });
        }
    });
    model.events.updated.attach(function (e) {
        if (e.model.hasChanges())
            return;

        if (koModel.nextTask()) {
            koModel.createProjectTask();
        } else if (koModel.needRefresh) {
            koModel.projectTasksPager.refresh();
        }
    });

    koModel.activeUsers = function (id) {
        var users = koModel.users();
        users = users.where(function (it) {
            return (!it.deleted() && !it.blocked() /*&& it.roleID() > 1 && it.roleID() < 4*/) || it.id() == id;
        }).orderBy("val=>val.fullName()");
        return users;
    };

    koModel.taskStatuses = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskStatuses);
    };

    koModel.fillDateEnd = function (row) {
        if (!row.dateBegin() || row.entity.inParse || row.dateEnd() || !row.type() || ejs.isEmpty(row.type().duration()))
            return;
        var duration = row.type().duration();
        try {
            var date = $.datepicker.parseDate($.datepicker._defaults.dateFormat, row.dateBegin());
            date.setDate(date.getDate() + duration);
            row.dateEndPlan(date.toSds());
        } catch (ex)
        { }
    };

    koModel.filter.likeKeywords = ko.cmp(function () {
        return ejs.isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%";
    });

    koModel.filter.text.subscribe(function () {
        koModel.projectTasksCrud.refresh();
    });
    return model;
};

function initProjectTasks(koModel, model, data) {
    var sn = "/Manager/Tasks#tblProjectTasks";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.projectTasksCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.projectTasks,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divProjectTasks"),
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        //pageSize: -1,
        pure: true,
        excel: "Задачи",
        tdStyle: "backgroundColor: status()?status().color():null",
        columns:
        [{
            title: "Проект",
            name: "projectID",
            orderBy: "projectName",
            value: "flprojectName",
            disable: "id()>0",
            type: "autocomplete",
            method: "loadProjects",
            showTemplate: "<a data-bind=\"html: flprojectName, attr: { href: host.arp + 'Project/Index/' + projectID() }\" target=\"_blank\"></a>",
            options: "projects",
            filterType: "string",
            filterName: "projectName",
            required: true,
            filter: true
        }, {
            title: "Исполнитель",
            name: "employeeID",
            orderBy: "employee.FullName",
            value: "flemployeeName",
            type: "autocomplete",
            method: "loadEmployees",
            showTemplate: "<a data-bind=\"html: flemployeeName, attr: { href: host.arp + 'Employee/Index/' + employeeID() }\" target=\"_blank\"></a>",
            required: true,
            filterType: "string",
            filterName: "employee.FullName",
            filter: true
        }, {
            title: "Задача",
            name: "typeID",
            value: "flname",
            type: "autocomplete",
            method: "loadTaskTypes, onchange: $root.taskChange",
            orderBy: "name",
            filterName: "name",
            filterType: "string",
            required: true,
            filter: true
        }, {
            name: "duration",
            title: "&nbsp;",
            editOnly: true,
            visible: "type()&&type().duration()>0",
            template: "#scrDuration"
        }, {
            title: "Выполнена",
            name: "completed",
            type: "checkbox",
            filter: true,
            showOnly: true
        }, {
            title: "Состояние",
            name: "statusID",
            orderBy: "status.Name",
            value: "flstatusName",
            type: "select",
            showOnly: true,
            filterOptions: "taskStatuses()",
            filter: true
        }, {
            title: "Тип проекта",
            name: "projectType",
            orderBy: "project.ProjectType.Name",
            value: "flprojectType",
            showOnly: true,
            filterType: "string",
            filterName: "project.ProjectType.Name",
            filter: true
        }, {
            title: "Статус",
            name: "statusText",
            value: "flstatusText",
            type: "textarea",
            filterType: "string",
            filter: true
        }, {
            title: "Просрочена",
            name: "overdue",
            type: "checkbox",
            filter: true,
            showOnly: true
        }, {
            title: "Ответственный",
            name: "responsibleID",
            orderBy: "userResponsible.FullName",
            value: "flresponsibleName",
            //showTemplate: "<a data-bind=\"text: responsible().fullName, attr: { href: host.arp + 'Employee/Index/' + responsibleID() }\" target=\"_blank\"></a>",
            type: "select",
            defaultValue: host.uid,
            options: "activeUsers($data.responsibleID())",
            optionsText: "fullName",
            filterOptions: "activeUsers()",
            required: true,
            filter: true
        }, {
            title: "Активировать после задачи",
            name: "previousID",
            orderBy: "previousTask.Name",
            value: "flpreviousName",
            type: "autocomplete",
            method: "loadTasks, onchange: $root.previousChange",
            filterName: "previousTask.Name",
            filter: true
        }, {
            title: "Дата начала",
            name: "dateBegin",
            type: "date",
            filter: true
        }, {
            title: "План. окончание",
            name: "dateEndPlan",
            type: "date",
            filter: true
        }, {
            title: "Факт. окончание",
            name: "dateEnd",
            type: "date",
            filter: true
        }, {
            title: "Порядок выполнения",
            name: "orderNumber",
            type: "number",
            showOnly: true,
            filter: true
            //}, {
            //    title: "&nbsp;",
            //    name: "next",
            //    editOnly: true,
            //    editTemplate: "<a data-bind=\"click: $root.createNextTask\" href=\"javascript:\">добавить следующую&gt;</a>"
        }, {
            title: "Последнее сообщение",
            name: "message",
            value: "flmessage",
            type: "textarea",
            filter: true,
            filterType: "string",
            showOnly: true
        }, {
            title: "История",
            name: "messages",
            editOnly: true,
            editRowTemplate: "#scrTaskMessages"
        }],
        filters: [{
            property: "project.Deleted",
            value: false,
            type: "bool"
        }, {
            property: "group", value: koModel.filter.likeKeywords, condition: "like", innerOperand: "or", type: "group", filters: ["projectName", "project.ProjectType.Name", "employee.FullName", "name", "status.Name", "statusText", "userResponsible.FullName", "previousTask.Name", "message"]
        }],
        includes: [ejs.cip(model.users, false, "", "UserResponsible"), ejs.cip(model.projects)]
    });

    koModel.projectTasksCrud.events.editing.attach(function (e) {
        ejs.busy("projectTaskMessages");
        if (!e.row.type() && e.row.typeID())
            model.taskTypes.getByID(e.row.typeID(), function () { });
        model.projectTaskMessages.getChildren(e.row.id(), "taskID", function () {
            ejs.free("projectTaskMessages");
        });
    });

    koModel.projectTasksCrud.events.edited.attach(function (e) {

        var dlg = koModel.projectTasksCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование задачи" });
    });

    koModel.projectTasksCrud.events.created.attach(function (e) {
        var row = e.row;
        //e.row.projectID(koModel.project.id());
        if (koModel.nextTask() && koModel.previousTask()) {
            var prev = koModel.previousTask();
            row.projectID(prev.projectID());
            row.previousID(prev.id());
            row.previousName(prev.name());
            row.dateBegin(prev.dateEnd() || prev.dateEndPlan());
            row.orderNumber(prev.orderNumber() * 1 + 1);
        }
        if (host.eid > 0) {
            row.employeeID(host.eid);
            row.employeeName(host.uname);
        }
        koModel.nextTask(false);
        koModel.previousTask(null);

        var dlg = koModel.projectTasksCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание задачи" });
    });

    koModel.projectTasksCrud.events.updated.attach(function (e) {
        var row = e.row;
        var m = row.newMessage();
        if (m) {
            var mess = model.projectTaskMessages.create();
            mess.taskID(row.id());
            mess.text(m);
            row.message(m);
        }
        koModel.needRefresh = koModel.needRefresh || koModel.projectTasks().any("val=>val.previousID()==" + row.id());
    });

    koModel.projectTasksCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    koModel.projectTasksPager.events.pageChanged.attach(function (e) {
        koModel.needRefresh = false;
    });

    if (!cols) {
        koModel.projectTasksCrud.getPager().refresh();
    }

    koModel.projectTasksCrud.getEditor().events.autocompleteSelected.attach(function (e) {
        if (e.name == "previousID" && koModel.projectTask())
            koModel.previousChange(e.event, e.ui, koModel.projectTask());
    });
    koModel.previousChange = function (event, ui, row) {
        if (!ui.item || !ui.item.source || !row)
            return;
        row.dateBegin(ui.item.source.dateEnd || ui.item.source.dateEndPlan);
        row.orderNumber(ui.item.source.orderNumber * 1 + 1);
    };

    //koModel.taskChange = function (event, ui, row) {
    //    if (!ui.item || !ui.item.source)
    //        return false;
    //};

    //koModel.createNextTask = function (row) {
    //    var ed = koModel.projectTasksCrud.getEditor();
    //    if (ed.validate() && ed.update()) {
    //        koModel.nextTask(true);
    //        koModel.previousTask(row);

    //        if (!koModel.hasChanges())
    //            setTimeout(function () {
    //                koModel.createProjectTask();
    //            }, 150);
    //    }
    //};
};