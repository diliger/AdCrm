var koModel = {
    filter: { text: ko.obs(""), projectName: ko.obs(""), projectID: ko.obs(""), completed: false, statusID: null, myOnly: ko.obs(false), projects: ko.obsa([]), typeID: ko.obs("") },
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

    koModel.defaultTaskType = koModel.taskTypes().first("val=>val.sysName()=='Task'");
    koModel.defaultTaskType = koModel.defaultTaskType ? koModel.defaultTaskType.id() : "";

    koModel.filter.completed = data.completed;
    koModel.filter.statusID = data.statusID;
    if (data.project) {
        koModel.filter.projectID(data.project.id);
        koModel.filter.projectName(data.project.fullName);
    }
    if (data.taskType) {
        koModel.filter.typeID(data.taskType.id);
    }

    koModel.filter.likeKeywords = ko.cmp(function () {
        return ejs.isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%";
    });

    koModel.filter.text.subscribe(function () {
        koModel.projectTasksCrud.refresh();
    });
    koModel.filter.toggleMy = function () {
        koModel.filter.myOnly(!koModel.filter.myOnly());
        if (!koModel.filter.myOnly())
            window.location.hash = window.location.hash.replace("MyOnly", "");
    };

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

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool"), ejs.cwp("statusID", host.projectStatuses.closed, "!=", "number")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.projects, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.projects.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.loadUsers = function (request, callback, row) {
        var name = row.responsibleName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.users, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.users.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.filter.projectID.subscribe(function () {
        //if (koModel.filter.projectID())
        //    koModel.filter.projects.push({ id: koModel.filter.projectID(), name: koModel.filter.projectName() });

        saveFilters();
        window.location = koModel.getUrl();
    });

    koModel.getUrl = function (projectID) {
        var p = window.location.pathname.contains("/Bugs") ? "Client/Bugs" : "Client/Tasks";
        projectID = projectID > 0 ? projectID : koModel.filter.projectID() || "";
        return [host.arp, p, "?ProjectID=", projectID, (koModel.filter.completed ? "&Completed=" : ""), koModel.filter.completed || "", (koModel.filter.statusID ? "&StatusID=" : ""), koModel.filter.statusID || ""].join("");
    };

    loadFilters();

    koModel.filter.projects.subscribe(saveFilters);
    koModel.filter.myOnly.subscribe(saveFilters);

    if (window.location.hash.contains("MyOnly")) {
        koModel.filter.myOnly(true);
    }

    initProjectTasks(koModel, model, data);
    koModel.filter.myOnly.subscribe(function () {
        koModel.projectTasksCrud.refresh();
    });

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

function initModel(koModel, data) {
    var model = new ejs.model({
        sets:
        [{
            name: "projectTasks",
            properties: ["comments", "completed", "employeeID", "dateBegin", "typeID", "dateEnd", "createDate", "name", "dateEndPlan", "projectID", "orderNumber", "responsibleID", "employeeName", "statusText", "statusID", "message",
            "previousID", "previousName", "newMessage", "overdue", "projectName", "projectType", "responsibleName", "description", "turnID", "priorityID", "term", "creator", "version", "deleted", "price"],
            belongs: ["project", { name: "responsible", setName: "users" }, { name: "status", setName: "statbooks" }, { name: "type", setName: "taskTypes" }, { name: "turn", setName: "statbooks" }, { name: "priority", setName: "statbooks" }],
            hasMany: [{ name: "messages", setName: "projectTaskMessages", fkProperty: "taskID" }]
        }, {
            name: "taskTypes",
            properties: ["comments", "deleted", "name", "shortName", "customerID", "orderNumber", "code", "sysName", "price", "customerName", "duration"]
        }, {
            name: "users",
            properties: ["fullName", "managerFee", "roleID", "deleted", "blocked"]
        }, {
            name: "projects",
            properties: ["fullName", "deleted", "parentName", "parentID", "responsibleID", "responsibleName", "employeeID", "employeeName"]
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
            e.ko.include(["responsible", "messages", "status", "project", "type", "turn", "priority"]);
            e.ko.dateBegin.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
            });
            e.ko.typeID.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
            });
            e.ko.statusName = ko.cmp(function () {
                return e.ko.status() ? e.ko.status().name() : "";
            });
            e.ko.priorityName = ko.cmp(function () {
                return e.ko.priority() ? e.ko.priority().name() : "";
            });
            e.ko.turnName = ko.cmp(function () {
                return e.ko.turn() ? e.ko.turn().name() : "";
            });
            e.ko.typeName = ko.cmp(function () {
                return e.ko.type() ? e.ko.type().name() : "";
            });

            var flprops = ["projectName", "employeeName", "name", "statusName", "statusText", "responsibleName", "previousName", "message", "projectType", "description", "priorityName", "turnName", "version", "typeName"];

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

            e.ko.projectID.subscribe(function (value) {
                if (!e.ko.project() || e.entity.inParse)
                    return;
                var p = e.ko.project();
                e.ko.responsibleID(p.responsibleID());
                e.ko.responsibleName(p.responsibleName());

                if (p.employeeID()) {
                    e.ko.employeeID(p.employeeID());
                    e.ko.employeeName(p.employeeName());
                }
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

    koModel.taskStatuses = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskStatuses);
    };
    koModel.taskPriorities = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskPriorities);
    };
    koModel.taskTurns = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskTurns);
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
    return model;
};

function initProjectTasks(koModel, model, data) {
    var sn = data.page + "#tblProjectTasks";
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
        gridParentScroll: ".right-content",
        gridPadding: 10,
        container: $("#divProjectTasks"),
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pure: true,
        removeField: "deleted",
        excel: "Задачи",
        columns: getTaskColumns(koModel, model, data),
        filters: [{
            property: "project.Deleted",
            value: false,
            type: "bool"
        }, {
            property: "project.ContractorID",
            value: host.ur == host.roles.client ? host.cid : null,
            type: "number"
        }, {
            property: "employeeID",
            value: host.ur == host.roles.employee ? host.eid : null,
            type: "number"
        }, {
            property: "visibilityID",
            value: host.ur == host.roles.client ? host.taskVisibilities.hidden : null,
            type: "number",
            condition: "!="
        //}, {
        //    property: "employeeID",
        //    value: function () { return host.ur == host.roles.employee && koModel.filter.myOnly() ? host.eid : null; },
        //    type: "number"
        }, {
            property: "statusID",
            value: host.taskStatuses.completed,
            condition: data.completed ? "==" : "!=",
            type: "number"
        }, {
            property: "projectID",
            value: koModel.filter.projectID,
            type: "number"
        }, {
            property: "typeID",
            value: koModel.filter.typeID,
            type: "number"
        }, {
            property: "statusID",
            value: koModel.filter.statusID,
            type: "number"
        }, {
            property: "group", value: koModel.filter.likeKeywords, condition: "like", innerOperand: "or", type: "group",
            filters: ["projectName", "project.ProjectType.Name", "employee.FullName", "name", "status.Name", "statusText", "userResponsible.FullName", "previousTask.Name", "message", "description", "priority.Name", "version", "type.Name"]
        }],
        includes: [ejs.cip(model.projects)],
        dialogButtons: [{
            title: "Сохранить",
            click: function (e) {
                if (!e.validate()) {
                    return;
                }
                e.update();
            }
        }, {
            title: "Сохранить и открыть",
            click: function (e) {
                if (!e.validate()) {
                    return;
                }
                var task = koModel.projectTask();
                koModel.projectTasksCrud.events.saved.attach(function (e) {
                    var p = window.location.pathname.contains("/Bugs") ? "Client/Bugs" : "Client/Tasks";
                    window.location = host.arp + p + "/Details/" + task.id();
                });
                e.update();
            }
        }, {
            title: "Отмена",
            click: function (e) {
                e.cancel();
            }
        }]
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
        initCkeditor();
    });

    koModel.projectTasksCrud.events.created.attach(function (e) {
        var row = e.row;
        if (host.eid > 0) {
            row.employeeID(host.eid);
            row.employeeName(host.uname);
        }

        //e.row.projectID(koModel.project.id());
        if (koModel.nextTask() && koModel.previousTask()) {
            var prev = koModel.previousTask();
            row.projectID(prev.projectID());
            row.projectName(prev.projectName());
            row.previousID(prev.id());
            row.previousName(prev.name());
            row.dateBegin(prev.dateEnd() || prev.dateEndPlan());
            row.orderNumber(prev.orderNumber() * 1 + 1);
        } else if (koModel.filter.projectID()) {
            row.projectID(koModel.filter.projectID());
            row.projectName(koModel.filter.projectName());
        } else if (data.projects.length == 1 || data.projects.length > 1 && host.ur == host.roles.client) {
            row.projectID(data.projects[0].id);
            row.projectName(data.projects[0].fullName);
        }

        koModel.nextTask(false);
        koModel.previousTask(null);

        var dlg = koModel.projectTasksCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание задачи" });
        initCkeditor();
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
};

function getTaskColumns(koModel, model, data) {
    var p = window.location.pathname.contains("/Bugs") ? "Client/Bugs" : "Client/Tasks";
    var contractor = host.cid > 0 || host.ur == host.roles.client;
    var columns = [];
    columns.push({
        title: "ID",
        name: "id",
        showTemplate: "<a data-bind=\"html: id, attr: { href: host.arp + '" + p + "/Details/' + id() }\"></a>",
        type: "number",
        showOnly: true,
        filter: true
    }, {
        title: "Дата создания",
        name: "createDate",
        type: "date",
        filter: true,
        showOnly: true
    }, {
        title: "Автор",
        name: "creator",
        filter: true,
        showOnly: true
    }, {
        title: "Проект",
        name: "projectID",
        showTemplate: "<a data-bind=\"html: flprojectName, attr: { href: host.arp + 'Project/Index/' + projectID() }\"></a>",
        orderBy: "projectName",
        value: "flprojectName",
        disable: "id()>0",
        type: "autocomplete",
        method: "loadProjects",
        filterType: "string",
        filterName: "projectName",
        required: true,
        filter: true
    }, {
        title: "Тип задачи",
        name: "typeID",
        orderBy: "type.Name",
        value: "fltypeName",
        type: "select",
        visible: "!$root.filter.typeID()",
        defaultValue: koModel.filter.typeID() || koModel.defaultTaskType,
        options: "taskTypes",
        required: true,
        filter: true
    }, {
        title: "Тема",
        name: "name",
        value: "flname",
        showTemplate: "<a data-bind=\"html: flname, attr: { href: host.arp + '" + p + "/Details/' + id() }\"></a>",
        required: true,
        filter: true
    }, {
        title: "Описание",
        name: "description",
        value: "fldescription",
        editTemplate: "#scrDescription",
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
        title: "Важность",
        name: "priorityID",
        orderBy: "priority.OrderNumber",
        value: "flpriorityName",
        showTemplate: "<div data-bind=\"html: flpriorityName, style: { backgroundColor: priority() ? priority().color() : '' }\" class=\"status\"></div>",
        type: "select",
        defaultValue: host.taskPriorities.normal,
        options: "taskPriorities()",
        optionsCaption: "Укажите важность",
        filterOptions: "taskPriorities()",
        filter: true
    }, {
        title: "Статус",
        name: "statusID",
        orderBy: "status.OrderNumber",
        value: "flstatusName",
        showTemplate: "<div data-bind=\"html: flstatusName, style: { backgroundColor: status() ? status().color() : '' }\" class=\"status\"></div>",
        type: "select",
        options: "taskStatuses()",
        filter: true
    }, {
        title: "Чей ход",
        name: "turnID",
        orderBy: "turn.Name",
        value: "turn().name",
        type: "select",
        options: "taskTurns()",
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
        title: "Просрочена",
        name: "overdue",
        type: "checkbox",
        filter: true,
        showOnly: true
    }, {
        title: "Последнее сообщение",
        name: "message",
        value: "flmessage",
        type: "textarea",
        filter: true,
        filterType: "string",
        showOnly: true
    }, {
        title: "Версия",
        name: "version",
        value: "flversion",
        filter: true,
        filterType: "string",
        showOnly: true
    });

    if (!contractor) {
        columns.push({
            title: "Оценка (часов)",
            name: "termHours",
            value: "term",
            filterType: "number",
            filter: true
        }, {
            title: "Оценка (руб)",
            name: "price",
            filterType: "number",
            filter: true
        }, {
            title: "Ответственный",
            name: "responsibleID",
            orderBy: "userResponsible.FullName",
            value: "flresponsibleName",
            type: "autocomplete",
            method: "loadUsers",
            filterType: "string",
            filterName: "userResponsible.FullName",
            required: true,
            filter: true
        }, {
            title: "Исполнитель",
            name: "employeeID",
            orderBy: "employee.FullName",
            value: "flemployeeName",
            type: "autocomplete",
            method: "loadEmployees",
            required: true,
            filterType: "string",
            filterName: "employee.FullName",
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
        });
    }

    return columns;
};

function initCkeditor() {
    if (koModel.ckeditor)
        return;
    var fnCkUpdate = function (a, e) { a.editor.updateElement(); koModel.projectTask().description(a.editor.getData()); };
    koModel.ckeditor = CKEDITOR.replace('txtDescription');
    CKEDITOR.instances.txtDescription.on('change', fnCkUpdate);
    CKEDITOR.instances.txtDescription.on('key', fnCkUpdate);

    var dlg = koModel.projectTasksCrud.getEditor().getDialog();
    dlg.dialog({ width: 875 });
};

function saveFilters() {
    if (typeof localStorage == "undefined")
        return;
    var key = "Tasks_Filter_" + host.uid;
    var result = { projects: {}, myOnly: koModel.filter.myOnly() };
    var projects = koModel.filter.projects().select("x=>x");
    if (koModel.filter.projectID()) {
        projects.push({ id: koModel.filter.projectID(), name: koModel.filter.projectName() });
    }
    for (var i = 0; i < projects.length; i++) {
        var p = projects[i];
        if (!p.name)
            continue;
        result.projects["p" + p.id] = p.name;
    }
    result = JSON.stringify(result);
    localStorage.setItem(key, result);
};

function loadFilters() {
    if (typeof localStorage == "undefined")
        return;
    var key = "Tasks_Filter_" + host.uid;
    var filter = localStorage.getItem(key);
    if (!filter)
        return;
    try {
        filter = JSON.parse(filter);
    } catch (ex) {
        return;
    }

    if (!filter)
        return;

    for (var i in filter.projects) {
        var id = i.substring(1);
        var name = filter.projects[i];
        if (!name)
            continue;
        koModel.filter.projects.push({ id: id, name: name });
    }

    koModel.filter.myOnly(filter.myOnly);
};