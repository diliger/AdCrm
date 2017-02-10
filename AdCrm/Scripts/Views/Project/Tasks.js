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
        selected: true,
        url: "#"
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
        url: host.arp + "Project/Payrolls/{0}"
    }, {
        id: 6,
        frmID: "frmFinances",
        name: "финансы",
        url: host.arp + "Project/Index/{0}#frmFinances"
    }, {
        id: 9,
        frmID: "frmFiles",
        name: "файлы",
        url: host.arp + "Project/Files/{0}"
    }]),
    previousTask: ko.obs(),
    nextTask: ko.obs(),
    hideThePage: ko.obs(false),
    needRefresh: false
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = toJsObject(data);
    var model = initModel(koModel, data);

    koModel.projectID = data.projects[0].id;
    model.projects.refreshData(data.projects);
    model.toKo(koModel);
    koModel.project = koModel.projects().first();
    model.addData(data);

    koModel.itabs().select("val=>val").forEach(function (row) {
        if (row.url) {
            row.url = row.url.replace("{0}", koModel.projectID);
        }
        var frms = [2, 4, 5, 6];
        if (koModel.project.parentID() && frms.contains(row.id))
            koModel.itabs.remove(row);
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

    //koModel.loadTasksByCode = function (request, callback, row) {
    //    return koModel.loadWorks(request, callback, row, true);
    //};
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
        var pIDs = [row.projectID(), koModel.project.parentID(), koModel.project.id()].where("val=>val>0").distinct();

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

    initProjectTasks(koModel, model, data);

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
            name: "projectTasks",
            properties: ["comments", "completed", "employeeID", "dateBegin", "typeID", "dateEnd", "createDate", "name", "dateEndPlan", "projectID", "orderNumber", "responsibleID", "employeeName", "statusText", "statusID", "message",
            "previousID", "previousName", "newMessage"],
            belongs: ["project", { name: "responsible", setName: "users" }, { name: "status", setName: "statbooks" }, { name: "type", setName: "taskTypes" }],
            hasMany: [{ name: "messages", setName: "projectTaskMessages", fkProperty: "taskID" }]
        }, {
            name: "taskTypes",
            properties: ["comments", "deleted", "name", "shortName", "customerID", "orderNumber", "code", "unitName", "price", "customerName", "duration"]
        }, {
            name: "users",
            properties: ["fullName", "managerFee", "roleID", "deleted", "blocked"]
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
            e.ko.include(["project", "responsible", "messages", "status", "type"]);
            e.ko.dateBegin.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
            });
            e.ko.typeID.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
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
    return model;
};

function initProjectTasks(koModel, model, data) {
    var sn = "/Project/Tasks#tblProjectTasks";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value);
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
        pageSize: -1,
        pure: true,
        excel: "Задачи",
        tdStyle: "backgroundColor: status()?status().color():null",
        columns:
        [{
            title: "Выполнена",
            name: "completed",
            type: "checkbox",
            filter: true,
            showOnly: true
        }, {
            title: "Состояние",
            name: "statusID",
            orderBy: "status.Name",
            value: "status().name",
            type: "select",
            showOnly: true,
            filterOptions: "taskStatuses()",
            filter: true
        }, {
            title: "Проект",
            name: "projectID",
            orderBy: "project.Name",
            value: "project().name",
            type: "select",
            options: "projects",
            filterType: "select",
            required: true,
            filter: true
        }, {
            title: "Название задачи",
            name: "name",
            orderBy: "name",
            filterName: "name",
            showTemplate: "<a data-bind=\"html: name, attr: { href: host.arp + 'Client/Tasks/Details/' + id() }\"></a>",
            required: true,
            filter: true
        }, {
            name: "duration",
            title: "&nbsp;",
            editOnly: true,
            visible: "type()&&type().duration()>0",
            template: "#scrDuration"
        }, {
            title: "Ответственный",
            name: "responsibleID",
            orderBy: "userResponsible.FullName",
            value: "responsible()?responsible().fullName:\"\"",
            type: "select",
            defaultValue: host.uid,
            options: "activeUsers($data.responsibleID())",
            optionsText: "fullName",
            filterOptions: "activeUsers()",
            required: true,
            filter: true
        }, {
            title: "Исполнитель",
            name: "employeeID",
            orderBy: "employee.FullName",
            value: "employeeName",
            type: "autocomplete",
            method: "loadEmployees",
            required: true,
            filterName: "employee.FullName",
            filter: true
        }, {
            title: "Активировать после задачи",
            name: "previousID",
            orderBy: "previousTask.Name",
            value: "previousName",
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
        }, {
            title: "&nbsp;",
            name: "next",
            editOnly: true,
            editTemplate: "<a data-bind=\"click: $root.createNextTask\" href=\"javascript:\">добавить следующую&gt;</a>"
        }, {
            title: "Статус",
            name: "statusText",
            type: "textarea",
            filter: true
        }, {
            title: "Последнее сообщение",
            name: "message",
            type: "textarea",
            filter: true,
            showOnly: true
        }, {
            title: "История",
            name: "messages",
            editOnly: true,
            editRowTemplate: "#scrTaskMessages"
        }],
        filters: [{
            property: "project", value: true, type: "group", filters: [{
                property: "projectID",
                value: koModel.project.id(),
                type: "number",
                operand: "or"
            }, {
                property: "project.ParentID",
                value: koModel.project.id(),
                type: "number",
                operand: "or"
            }]
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
        dlg.dialog({ title: "Редактирование задачи проекта" });
    });

    koModel.projectTasksCrud.events.created.attach(function (e) {
        var row = e.row;
        e.row.projectID(koModel.project.id());
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
        dlg.dialog({ title: "Создание задачи проекта" });
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

    koModel.createNextTask = function (row) {
        var ed = koModel.projectTasksCrud.getEditor();
        if (ed.validate() && ed.update()) {
            koModel.nextTask(true);
            koModel.previousTask(row);

            if (!koModel.hasChanges())
                setTimeout(function () {
                    koModel.createProjectTask();
                }, 150);
        }
    };
};