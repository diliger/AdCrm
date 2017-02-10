var koModel = {
    filter: { text: ko.obs(""), projectName: ko.obs(""), projectID: ko.obs(""), completed: false, statusID: null, myOnly: ko.obs(false), projects: ko.obsa([]), typeID: ko.obs("") }
};
$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = toJsObject(data);

    var model = initModel(koModel);
    model.addData(data);
    model.toKo(koModel);


    koModel.defaultTaskType = koModel.taskTypes().first("val=>val.sysName()=='Task'");
    koModel.defaultTaskType = koModel.defaultTaskType ? koModel.defaultTaskType.id() : "";

    koModel.setHeight = function () {
        var h = $(window).height() - 120;

        $("div.table").each(function () {
            var frm = $(this);
            frm.css("min-height", h / 2 + "px");
        });
    };

    koModel.setHeight();

    initClientTasks(koModel, model, data);
    initClientInvoices(koModel, model, data);
    initClientPayments(koModel, model, data);
    initClientProjects(koModel, model, data);


    ko.apply(koModel);


});

function initModel(koModel) {
    var model = new ejs.model({
        sets:
        [{
            name: "projects",
            properties: ["address", "archived", "changeDate", "changerID", "comments", "contractorID", "employeeName", "employeeID", "typeName", "number", "cost", "createDate", "creatorID", "deleted", "name", "parentName", "parentID", "statusID", "responsibleID", "dateEnd", "archiveDate", "missingContract", "missingAct", "incomeSum", "worksCost", "outgoingSum", "dateSign", "responsibleName", "managerFee", "subcontractorID", "managerFeeAmount", "managerFeePaid", "fullName", "code", "statusName"]
        }, {
            name: "projectStatuses",
            properties: ["name", "color", "orderNumber"]
        }, {
            name: "payments",
            properties: ["sum", "roleID", "projectID", "number", "date", "creatorID", "comments", "workID", "isAdvance", "contractorID", "walletID", "invoiceNumber", "walletName", "invoiceID"],
            belongs: ["project", "invoice"]
        }, {
            name: "invoices",
            properties: ["date", "drawnDate", "changeDate", "projectID", "amount", "nulled", "number", "comments", "leftAmount", "paidAmount"]
        }, {
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

    koModel.createTask = function (project) {
        var task = koModel.createProjectTask();
        task.projectID(project.id());
        task.projectName(project.fullName());
    }

    koModel.loadProjects = function (request, callback, row) {
        var name = row.name().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("contractorID", host.cid, "=", "number")];
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
    }

    koModel.taskPriorities = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskPriorities);
    };

    koModel.taskStatuses = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskStatuses);
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

    model.events.updated.attach(function (e) {
        if (e.model.hasChanges())
            return;
    });

    model.events.koCreated.attach(function (e) {
        if (e.className === "projectTask") {
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
        }
    });
    return model;
};

function initClientInvoices(koModel, model, data) {
    var sn = "/Client/Home#tblInvoices";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value);
        } catch (ex) {
            cols = null;
        }
    }

    koModel.clientInvoicesCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.invoices,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divClientInvoices"),
        gridFilter: true,
        create: false,
        edit: false,
        remove: false,
        autoSave: true,
        pageSize: 10,
        pure: true,
        excel: "Счета",
        columns: [{
            title: "Дата",
            name: "date",
            type: "date",
            filter: true
        }, {
            title: "Дата выставления",
            name: "drawnDate",
            type: "date",
            filter: true
        }, {
            title: "№ счета",
            name: "number",
            filter: true,
            required: true
        }, {
            title: "Сумма",
            name: "amount",
            type: "number",
            filter: true,
            required: true
        }, {
            title: "Оплачено",
            name: "paidAmount",
            type: "number",
            showOnly: true,
            filter: true
        }, {
            title: "Комментарий",
            name: "comments",
            type: "textarea",
            filterType: "string",
            filter: true
        }, {
            title: "Аннулирован",
            name: "nulled",
            type: "checkbox",
            filter: true
        }],
        filters: [{
            property: "project.contractorID",
            value: host.cid,
            type: "number"
        }]
    });

    koModel.clientInvoicesCrud.events.created.attach(function (e) {
        e.row.date((new Date()).toSds());
        e.row.drawnDate((new Date()).toSds());
        e.row.changeDate((new Date()).toSds());
        e.row.number((new Date()).toSds());

        var dlg = koModel.clientInvoicesCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание счета" });
    });

    koModel.clientInvoicesCrud.events.edited.attach(function (e) {
        var dlg = koModel.clientInvoicesCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование счета" });
    });

    koModel.clientInvoicesCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    if (!cols) {
        koModel.clientInvoicesCrud.getPager().refresh();
    }
};

function initClientPayments(koModel, model, data) {
    var sn = "/Client/Home#tblPayments";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value);
        } catch (ex) {
            cols = null;
        }
    }

    koModel.clientPaymentsCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.payments,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divClientPayments"),
        gridFilter: true,
        create: false,
        edit: false,
        remove: false,
        autoSave: true,
        pageSize: 10,
        pure: true,
        excel: "Платежи",
        columns: [{
            title: "№ платежа",
            name: "number",
            filter: true,
            required: true
        }, {
            title: "№ счета",
            name: "invoiceID",
            value: "invoiceNumber",
            filter: true,
            required: true
        }, {
            title: "Дата платежа",
            name: "date",
            type: "date",
            filter: true
        }, {
            title: "Кошелек",
            name: "walletID",
            value: "walletName",
            filter: true,
            required: true
        }, {
            title: "Сумма",
            name: "sum",
            type: "number",
            filter: true,
            required: true
        }, {
            title: "Аванс",
            name: "isAdvance",
            type: "checkbox",
            filter: true
        }, {
            title: "Комментарий",
            name: "comments",
            type: "textarea",
            filterType: "string",
            filter: true
        }],
        filters: [{
            property: "project.contractorID",
            value: host.cid,
            type: "number"
        }]
    });

    koModel.clientPaymentsCrud.events.created.attach(function (e) {
        e.row.roleID(6);
        e.row.date((new Date()).toSds());
        e.row.number((new Date()).toSds());

        var dlg = koModel.clientPaymentsCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание платежа" });

    });

    koModel.clientPaymentsCrud.events.edited.attach(function (e) {
        var dlg = koModel.clientPaymentsCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование счета" });
    });

    koModel.clientPaymentsCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    if (!cols) {
        koModel.clientPaymentsCrud.getPager().refresh();
    }
};

function initClientProjects(koModel, model, data) {
    var sn = "/Client/Home#tblProjects";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value);
        } catch (ex) {
            cols = null;
        }
    }

    koModel.clientProjectsCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.projects,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divClientProjects"),
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 10,
        pure: true,
        excel: "Проекты",
        columns: [
        {
            title: "Родительский проект",
            name: "parentID",
            value: "parentName",
            type: "autocomplete",
            method: "loadProjects",
            filter: true
        }, {
            title: "Проект",
            name: "name",
            filter: true,
            required: true
        }, {
            title: "Код проекта",
            name: "code",
            filter: true,
            showOnly: true
        }, {
            title: "Ответственный",
            name: "responsibleName",
            filter: true,
            showOnly: true
        }, {
            title: "Статус проекта",
            name: "statusName",
            type: "string",
            filter: true,
            showOnly: true
        }, {
            title: "&nbsp;",
            name: "addTask",
            showOnly: true,
            sortable: false,
            showTemplate: "#scrAddTask"
        }],
        filters: [{
            property: "deleted",
            value: "false",
            type: "bool"
        }, {
            property: "contractorID",
            value: host.cid,
            type: "number"
        }]
    });

    koModel.clientProjectsCrud.events.created.attach(function (e) {
        e.row.dateSign((new Date()).toSds());
        e.row.contractorID(host.cid);
        e.row.changerID(host.uid);
        e.row.creatorID(host.uid);
        var dlg = koModel.clientProjectsCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание проекта" });
    });

    koModel.clientProjectsCrud.events.edited.attach(function (e) {
        var dlg = koModel.clientProjectsCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование проекта" });
    });

    koModel.clientProjectsCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    if (!cols) {
        koModel.clientProjectsCrud.getPager().refresh();
    }
};

function initClientTasks(koModel, model, data) {
    var sn = "/Client/Home#tblTasks";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var p = window.location.pathname.contains("/Bugs") ? "Client/Bugs" : "Client/Tasks";
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value);
        } catch (ex) {
            cols = null;
        }
    }

    koModel.clientTasksCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.projectTasks,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divClientTasks"),
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 10,
        pure: true,
        excel: "Задачи",
        columns:
        [{
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
            title: "Проект",
            name: "projectID",
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
            title: "Просрочена",
            name: "overdue",
            type: "checkbox",
            filter: true,
            showOnly: true
        }],
        filters: [{
            property: "project.deleted",
            value: "false",
            type: "bool"
        }, {
            property: "project.contractorID",
            value: host.cid,
            type: "number"
        }],
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
                koModel.clientTasksCrud.events.saved.attach(function (e) {
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

    koModel.clientTasksCrud.events.edited.attach(function (e) {
        var dlg = koModel.clientTasksCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование задачи" });
        initCkeditor();
    });

    koModel.clientTasksCrud.events.created.attach(function (e) {
        var row = e.row;
        if (host.eid > 0) {
            row.employeeID(host.eid);
            row.employeeName(host.uname);
        }

        var dlg = koModel.clientTasksCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание задачи" });
        initCkeditor();
    });

    koModel.clientTasksCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });


    if (!cols) {
        koModel.clientTasksCrud.getPager().refresh();
    }
};

function initCkeditor() {
    if (koModel.ckeditor)
        return;
    var fnCkUpdate = function (a, e) { a.editor.updateElement(); koModel.projectTask().description(a.editor.getData()); };
    koModel.ckeditor = CKEDITOR.replace('txtDescription');
    CKEDITOR.instances.txtDescription.on('change', fnCkUpdate);
    CKEDITOR.instances.txtDescription.on('key', fnCkUpdate);

    var dlg = koModel.clientTasksCrud.getEditor().getDialog();
    dlg.dialog({ width: 875 });
};