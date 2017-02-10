var koModel = {
    itabs: ko.obsa([{
        id: 1,
        name: "расходы",
        url: host.arp + "Employee/Index/{0}"
    }, {
        id: 2,
        name: "подотчетные деньги",
        url: host.arp + "Employee/Index/{0}"
    }, {
        id: 3,
        name: "передача денег",
        url: host.arp + "Employee/Index/{0}"
        //}, {
        //    id: 4,
        //    name: "стоимость расходов",
        //    url: host.arp + "Employee/Index/{0}"
    }, {
        id: 5,
        frmID: "frmTasks",
        name: "задачи",
        selected: true,
        url: "#"
    }, {
        id: 5,
        frmID: "frmSalary",
        name: "зарплата",
        url: host.arp + "Employee/Salary/{0}"
    }]),
    hideThePage: ko.obs(false),
    needRefresh: false
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = toJsObject(data);
    var model = initModel(koModel, data);

    koModel.employeeID = data.employee.id;
    model.refreshData(data);
    model.employees.addData([data.employee]);
    model.toKo(koModel);
    koModel.getModel = function () { return model; };
    koModel.employee = koModel.employees().first();

    koModel.itabs().forEach(function (it) {
        it.url = it.url.replace("{0}", koModel.employeeID);
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

        top.busy("UpdateEmployee");

        model.update(function (result) {
            top.free("UpdateEmployee");
            var changes = result.changes.updated.any() || result.changes.deleted.any();
            if (showQtip == false || result.canceled.any()) {
            } else if (showQtip == true || changes) {
                window.showTip("Данные успешно сохранены");
            }

            if (typeof callback == "function") {
                callback(result);
            }
        });
        return true;
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
            name: "employees",
            properties: data.employeeProperties.select("val=>ejs.toJsName(val)"),
            belongs: [{ name: "position" }, { name: "department" }]
        }, {
            name: "projectTasks",
            properties: ["comments", "completed", "employeeID", "dateBegin", "typeID", "dateEnd", "createDate", "name", "dateEndPlan", "projectID", "orderNumber", "responsibleID", "employeeName", "statusText", "statusID", "message",
            "previousID", "previousName", "newMessage", "projectName"],
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
            name: "refbooks",
            properties: ["comments", "name", "deleted", "orderNumber", "typeID"],
            hasMany: [{ name: "stages", setName: "workStages", fkProperty: "categoryID" }]
        }, {
            name: "statbooks",
            properties: ["comments", "name", "orderNumber", "typeID", "color"]
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
        } else if (e.className == "employee") {
            e.ko.include(["position", "department"]);
            //ko.toDobs(e.ko.lastSalary);
            //e.ko.balance = ko.obs(e.ko.balance());
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

            //if (e.ko.id() < 0) {
            //    var dep = koModel.departments().first("val=>!val.deleted()");
            //    e.ko.departmentID(dep ? dep.id() : "");

            //    var position = koModel.activePositions(e.ko).first();
            //    e.ko.positionID(position ? position.id() : "");
            //}
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
    var sn = "/Employee/Tasks#tblProjectTasks";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
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
        pageSize: -1,
        pure: true,
        excel: "Задачи",
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
            orderBy: "projectName",
            value: "projectName",
            disable: "id()>0",
            type: "autocomplete",
            method: "loadProjects",
            //showTemplate: "<a data-bind=\"html: flprojectName, attr: { href: host.arp + 'Project/Index/' + projectID() }\" target=\"_blank\"></a>",
            options: "projects",
            filterType: "string",
            filterName: "projectName",
            required: true,
            filter: true
        }, {
            title: "Название задачи",
            name: "name",
            orderBy: "name",
            filterName: "name",
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
            property: "employee", value: true, type: "group", filters: [{
                property: "employeeID",
                value: koModel.employeeID,
                type: "number",
                operand: "or"
            }, {
                property: "creator",
                value: host.login,
                operand: "or"
            }, {
                property: "responsibleID",
                value: host.uid,
                type: "number",
                operand: "or"
            }]
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

    koModel.projectTasksCrud.events.creating.attach(function (e) {
        var row = e.row;
        e.row.responsibleID(host.uid);
        e.row.employeeID(koModel.employeeID);
        e.row.employeeName(koModel.employee.fullName());
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
