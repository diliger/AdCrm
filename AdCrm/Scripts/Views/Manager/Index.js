var koModel = {
    filter: {
        text: ko.obs(""),
        onlyMy: ko.obs(false),
        archived: ko.obs(false),
        statusID: ko.obs(),
        managerFee: ko.obs(false),
        defer: ko.obs(false)
    },
    project: {
        inserted: ko.obs(null),
        selectedArray: ko.obsa([]),
        contractor: ko.obs(null)
    },
    duplicates: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/Manager/Index#tblProjects", "tblProjects"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "projects",
            properties: ["address", "archived", "changeDate", "changerID", "comments", "contractorID", "employeeName", "employeeID", "typeName", "number", "cost", "createDate", "creatorID", "deleted", "name", "parentName", "parentID", "statusID",
                "dateEnd", "archiveDate", "missingContract", "missingAct", "incomeSum", "worksCost", "outgoingSum", "dateSign", "responsibleName", "managerFee", "subcontractorID", "managerFeeAmount", "managerFeePaid"],
            belongs: [{ name: "contractor" }, { name: "subcontractor", setName: "contractors" }, { name: "status", setName: "projectStatuses" }, { name: "type", setName: "projectTypes" }, { name: "employee", setName: "employees" }]
        }, {
            name: "contractors",
            properties: ["address", "changeDate", "changerID", "createDate", "creatorID", "deleted", "name", "roleID", "typeID", "mainContactName", "mainContactsText", "description", "sourceID"],
            hasMany: [{ name: "projects", fkProperty: "contractorID" }]
        }, {
            name: "projectStatuses", className: "projectStatus",
            properties: ["name", "color", "orderNumber"]
        }, {
            name: "projectTypes", className: "typeName",
            properties: ["name", "orderNumber"]
        }, {
            name: "employees", className: "employee",
            properties: ["fullName"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "project") {
            ko.toDobs(e.ko.cost);
            e.ko.include(["contractor", "subcontractor", "status"]);

            e.ko.flname = ko.cmp(function () {
                return z.filter.markMatches(e.ko.name(), koModel.filter.text());
            });

            e.ko.fladdress = ko.cmp(function () {
                return z.filter.markMatches(e.ko.address(), koModel.filter.text());
            });

            e.ko.flcontractorName = ko.cmp(function () {
                return e.ko.contractor() ? z.filter.markMatches(e.ko.contractor().name(), koModel.filter.text()) : "";
            });

            e.ko.flsubcontractorName = ko.cmp(function () {
                return e.ko.subcontractor() ? z.filter.markMatches(e.ko.subcontractor().name(), koModel.filter.text()) : "";
            });

            e.ko.flresponsibleName = ko.cmp(function () {
                return z.filter.markMatches(e.ko.responsibleName(), koModel.filter.text());
            });

            e.ko.overdue = ko.cmp(function () {
                if (e.ko.archived() || !e.ko.dateEnd()) {
                    return 0;
                }
                return parseDate(e.ko.dateEnd()).dateDiff(new Date()).days;
            });
        }
    });
    
    model.refreshData(data);
    model.toKo(koModel);
    var stFilter = {
        property: "status", value: true, type: "group", innerOperand: "or",
        filters: [{
            property: "statusID",
            value: host.projectStatuses.hidden,
            type: "number",
            condition: "!="
        }, {
            property: "statusID",
            value: true,
            type: "number",
            condition: "isNull"
        }]
    };
    var filters = [{
        property: "deleted",
        value: false,
        type: "bool"
    }, {
        property: "archived",
        value: koModel.filter.archived,
        type: "bool"
    }, {
        property: "managerDebt",
        value: function () { return koModel.filter.managerFee() ? 0 : ""; },
        condition: "!=",
        type: "number"
    }, {
        property: "responsibleID",
        value: host.ur == 3 ? host.uid : "",
        type: "number"
    }, {
        property: "statusID",
        value: koModel.filter.statusID,
        type: "number"
    }, {
        property: "parentID",
        value: true,
        condition: "isNull",
        type: "number"
    }, {
        value: function () { return isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%"; },
        condition: "like", type: "group", property: "group",
        filters: [{ property: "name", type: "string", operand: "or" }, { property: "address", type: "string", operand: "or" }, { property: "contractor.Name", type: "string", operand: "or" },
            { property: "subcontractor.Name", type: "string", operand: "or" }, { property: "responsibleName", type: "string", operand: "or" }]
    }];
    if (host.ur != 1)
        filters.push(stFilter);

    koModel.pager = new ejs.remotePager({
        set: model.projects,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: filters,
        includes: [ejs.cip(model.contractors, false), ejs.cip(model.contractors, false, "", "subcontractor")]//ejs.createIncludeParameter(model.teams, false), 
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.updateAll = function (callback) {
        top.busy("UpdateProjects");
        model.update(function () {
            top.free("UpdateProjects");
            if (typeof callback == "function") {
                callback();
            }
        });
    };

    koModel.filter.archived.subscribe(function () {
        if (koModel.filter.defer())
            return;
        koModel.pager.goTo(0);
    });
    koModel.filter.onlyMy.subscribe(function () {
        if (koModel.filter.defer())
            return;
        koModel.pager.goTo(0);
    });
    koModel.filter.text.subscribe(function () {
        if (koModel.filter.defer())
            return;
        koModel.pager.goTo(0);
    });
    koModel.filter.statusID.subscribe(function () {
        if (koModel.filter.defer())
            return;
        koModel.pager.goTo(0);
    });
    koModel.filter.clear = function () {
        koModel.filter.defer(true);
        koModel.filter.text("");
        koModel.filter.statusID(null);
        koModel.filter.onlyMy(false);
        koModel.filter.archived(false);
        koModel.filter.managerFee(false);
        koModel.filter.defer(false);
        koModel.pager.goTo(0);
    };

    koModel.loadAll = function () {
        koModel.pager.setting.pageSize = -1;
        koModel.pager.refresh();
    };

    koModel.refresh = function () {
        if (koModel.filter.managerFee()) {
            model.projects.settings.mode = "managerFee";
        } else {
            model.projects.settings.mode = "";
        }
        koModel.pager.goTo(0);
    };

    koModel.project.edit = function (project) {
        if (!project) {
            project = koModel.project.selectedArray().first();
        }

        if (!project) {
            return;
        }

        window.location = ApplicationRootPath + "Project/Index/" + project.id();
    };

    koModel.createProject = function () {
        if (!koModel.project.inserted() || koModel.project.inserted().id() > 0) {
            koModel.project.inserted(new model.project().toKo());
        }
        $("#divProject").dialog("open");
    };

    koModel.cancelProject = function () {
        //koModel.project.inserted().entity.remove();
        koModel.project.inserted(null);
        $("#divProject").dialog("close");
    };

    koModel.updateProject = function () {
        if (!$("#frmProject").valid()) {
            return;
        }
        var project = koModel.project.inserted();
        project.id(model.getMinID());
        project.dateSign((new Date()).toSds());
        model.projects.insert(project.entity);
        koModel.updateAll(function () {
            koModel.project.edit(project);
        });
        $("#divProject").dialog("close");
    };

    koModel.toggleArchived = function () {
        var projects = koModel.project.selectedArray().select(function (it) { return koModel.projects().first("val=>val.id()==" + it); });
        if (!projects.any())
            return;
        if (koModel.filter.archived()) {
            koModel.unarchiveProjects(projects);
        } else {
            koModel.archiveProjects(projects);
        }
    };

    koModel.archiveProjects = function (projects) {

        var customerDebts = projects.where("val=>Math.round((val.cost() - val.incomeSum()) * 100) > 0");
        var contractorDebts = projects.where("val=>Math.round((val.worksCost() - val.outgoingSum()) * 100) > 0");
        var missingDocuments = projects.where(function (val) { return val.missingContract() || val.missingAct(); });
        var needConfirm = customerDebts.any() || contractorDebts.any() || missingDocuments.any();

        var message = [];
        message.push("Вы уверены, что хотите перевести ");
        message.push(projects.length == 1 ? "Проект " + projects[0].name() : projects.length + " " + i18n.declineCount(projects.length, "проект", "проекта", "проектов"));
        message.push(" в архив?\n");
        for (var i = 0; i < customerDebts.length; i++) {
            message.push(projects.length == 1 ? "По данному проекту" : "По проекту " + customerDebts[i].name());
            message.push(" есть задолженность у клиента.\n");
        }
        for (var i = 0; i < contractorDebts.length; i++) {
            message.push(projects.length == 1 ? "По данному проекту" : "По проекту " + contractorDebts[i].name());
            message.push(" есть задолженность субподрядчикам.\n");
        }
        for (var i = 0; i < missingDocuments.length; i++) {
            message.push(projects.length == 1 ? "По данному проекту" : "По проекту " + missingDocuments[i].name());
            message.push(" не получены все документы.\n");
        }
        message = message.join("");

        if (needConfirm && !confirm(message)) {
            return;
        }

        projects.forEach(function (it) {
            it.archived(true);
        });
        koModel.updateAll(function () {
            projects.forEach(function (it) {
                it.entity.detach();
            });
            koModel.project.selectedArray([]);
        });
    };

    koModel.unarchiveProjects = function (projects) {
        projects.forEach(function (it) {
            it.archived(false);
        });
        koModel.updateAll(function () {
            projects.forEach(function (it) {
                it.entity.detach();
            });
            koModel.project.selectedArray([]);
        });
    };

    koModel.removeProject = function () {
        var projects = koModel.project.selectedArray().select(function (it) { return koModel.projects().first("val=>val.id()==" + it); });;
        if (!projects.any())
            return;
        var message = ["Вы действительно хотите удалить ",
                       projects.length == 1 ? "проект " + projects[0].name() : projects.length + " " + i18n.declineCount(projects.length, "проект", "проекта", "проектов"),
                       "?"].join("");

        if (!confirm(message)) {
            return;
        }
        projects.forEach(function (it) {
            it.deleted(true);
        });
        koModel.updateAll(function () {
            projects.forEach(function (it) {
                it.entity.detach();
            });
            koModel.project.selectedArray([]);
        });
    };

    koModel.duplicateProject = function () {
        var projects = koModel.project.selectedArray().select(function (it) { return koModel.projects().first("val=>!val.parentID()&&val.id()==" + it); }).where("val=>val");
        if (!projects.any()) {
            ejs.alert("Внимание!", "Выберите проекты для копирования! Подпроекты нельзя копировать.");
            return;
        }
        var message = ["Вы действительно хотите скопировать ",
                       projects.length == 1 ? "проект " + projects[0].name() : projects.length + " " + i18n.declineCount(projects.length, "проект", "проекта", "проектов"),
                       "?"].join("");

        if (!confirm(message)) {
            return;
        }

        ejs.busy("DuplicateProject");
        $.rjson({
            url: host.arp + "Manager/DuplicateProject",
            data: { IDs: koModel.project.selectedArray() },
            success: function (result) {
                ejs.free("DuplicateProject");
                if (!result.Success) {
                    var m = result.Error || "Непредвиденная ошибка!";
                    ejs.alert(m, m);
                    return;
                }
                result = ejs.toJsObject(result);
                koModel.project.selectedArray([])
                koModel.refresh();
                koModel.duplicates(result.projects);
                koModel.showDuplicateResult();
            }, error: function (result) {
                var m = "Непредвиденная ошибка!";
                ejs.free("payManagerFee");
                ejs.alert(m, m);
            }
        });
    };

    koModel.showDuplicateResult = function () {
        $("#divDuplicateResult").dialog("open");
    };

    koModel.payManagerFee = function () {
        var projects = koModel.project.selectedArray().select(function (it) { return koModel.projects().first("val=>val.id()==" + it); });;
        if (!projects.any())
            return;
        var message = ["Вы действительно хотите выдать % менеджера по ",
                       projects.length == 1 ? "проекту " + projects[0].name() : projects.length + " " + i18n.declineCount(projects.length, "проекту", "проектам", "проектам"),
                       "?"].join("");

        if (!confirm(message)) {
            return;
        }
        ejs.busy("payManagerFee");
        $.rjson({
            url: host.arp + "Manager/PayManagerFee",
            data: { IDs: koModel.project.selectedArray() },
            success: function (result) {
                ejs.free("payManagerFee");
                if (!result.Success) {
                    var m = result.Error || "Непредвиденная ошибка!";
                    ejs.alert(m, m);
                    return;
                }
                koModel.project.selectedArray([])
                koModel.refresh();
            }, error: function (result) {
                var m = "Непредвиденная ошибка!";
                ejs.free("payManagerFee");
                ejs.alert(m, m);
            }
        });
    };

    koModel.loadProjects = function (request, callback, row) {
        var name = row.parentName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var items = filter.length <= 2 ? koModel.projects().where("val=>!val.deleted()&&val.name().contains('" + filter + "',1)") : [];
        if (items.length > 10) {

            var items = items.orderBy("val=>val.name().toLowerCase()").select(function (item) {
                return { label: item.name(), value: item.name(), source: item };
            });

            if (typeof callback == "function") {
                callback(items);
            } else {
                return items;
            }
        } else {
            var where = [ejs.cwp("deleted", false, "==", "bool")];
            if (filter) {
                var w = ejs.cwp("name", "%" + filter + "%", "like", "string");
                where.push(w);
            }

            model.projects.select(function (collection, result) {
                var items = result.select(function (item) { return { label: item.name, value: item.name, source: item }; });
                if (typeof callback == "function") {
                    callback(items.orderBy("val=>val.label.toLowerCase()"));
                } else {
                    return items;
                }
            }, where, [ejs.cop("name")], 20, "", "", "", "", false);
        }
    };

    koModel.searchKeyPress = function (data, event) {
        if (event.keyCode == 13 || event.which == 13) {
            var element = $(event.target);
            setTimeout(function () {
                element.change();
                if (!koModel.pager.loading()) {
                    koModel.refresh();
                }
            }, 100);
        }
        return true;
    };

    koModel.toExcel = function () {
        var projects = koModel.projects();
        if (koModel.project.selectedArray().any()) {
            var projects = koModel.project.selectedArray().select(function (it) { return projects.first("val=>val.id()==" + it); });;
        }

        var headers = ["Исполнитель", "Контрагент", "Контакты", "Проект", "Адрес", "Номер БС", "Статус", "Ответственный", "Дата начала", "Дата завершения"];

        var name = [koModel.filter.archived() ? "Архивные_" : "", "Проекты_", (new Date()).toSds()].join("");
        var rows = projects.select(function (it) {
            return [it.employeeName(), it.contractor() ? it.contractor().name() : "", it.contractor() ? it.contractor().mainContactsText() : '', it.name(), it.address(), it.number(),
            it.status() ? it.status().name() : '', it.responsibleName(), it.dateSign(), it.dateEnd()];
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    koModel.editContractor = function (project) {
        var id = project.contractor().id();
        var onClosed = contractorsDialogKoModel.show("Информация по клиенту", id);
        onClosed(function (result) {
            if (result) {
                var contractor = contractorsDialogKoModel.contractor();
                project.contractor().name(contractor.name());
                project.contractor().address(contractor.address());
                project.contractor().mainContactName(contractor.mainContactName());
                project.contractor().mainContactsText(contractor.mainContactsText());
                koModel.updateAll();
            }
        });
    };

    koModel.editSubcontractor = function (project) {
        var id = project.subcontractor().id();
        var onClosed = contractorsDialogKoModel.show("Информация по подрядчику", id);
        onClosed(function (result) {
            if (result) {
                var contractor = contractorsDialogKoModel.contractor();
                project.subcontractor().name(contractor.name());
                project.subcontractor().address(contractor.address());
                project.subcontractor().mainContactName(contractor.mainContactName());
                project.subcontractor().mainContactsText(contractor.mainContactsText());
                koModel.updateAll();
            }
        });
    };


    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblProjects").koGrid({
        koTemplateID: "trProject",
        headerContainer: $("#divProjectsHeader"),
        styleID: "stlProjectsGrid",
        tableID: "tblProjects",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        //source: koModel.project.rows,
        disallowSort: ["Save", "Select", "ContactPerson", "Contacts", "Cost"]
    });

    $("#divProject").dialog({
        autoOpen: false,
        draggable: true,
        resizable: false,
        modal: true,
        width: 550
    });

    $("#divDuplicateResult").dialog({
        autoOpen: false,
        draggable: true,
        resizable: false,
        modal: true,
        width: 550
    });

    $("#frmProject").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement
    });

    ko.apply(koModel);
    if (!koModel.pager.loading()) {
        koModel.pager.goTo(0);
    }
    loadHtml();
});

function loadHtml() {
    $.ajax({
        url: ApplicationRootPath + "Contractor/Dialog",
        success: function (result) {
            $("body").append(result);
        }
    });
}