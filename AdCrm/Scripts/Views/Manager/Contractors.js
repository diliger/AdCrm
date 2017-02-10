var koModel = {
    filter: {
        text: ko.obs(""),
        role: ko.obs(""),
        archived: ko.obs(false),
        typeID: ko.obs(),
        statusID: ko.obs()
    },
    contractor: {
        inserted: ko.obs(null),
        selected: ko.obs(null),
        selectedArray: ko.obsa([])
    },
    refbookTypes: { contactPersonTypes: 2, contractorNoteTypes: 3 },
    statbookTypes: { genders: 2 },
    grid: $.fn.koGrid.getSaveSettingsObject(host.p + "#tblContractors", "tblContractors"),
    dialog: { contractor: { result: ko.obs(""), id: "#divContractorDialog" } },
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "contractors",
            properties: ["address", "changeDate", "archived", "changerID", "createDate", "creatorID", "deleted", "name", "roleID", "typeID", "comments", "specialization", "statusID", "archiveDate",
                "description", "sourceID", "creatorName", "responsibleID", "subTypeID", "departmentID", "phone", "email"],
            belongs: [{ name: "type", setName: "contractorTypes" }, { name: "subType", setName: "contractorSubTypes" }, { name: "status", setName: "contractorStatuses" },
                { name: "source", setName: "informationSources" }, { name: "responsible", setName: "users" }, "department"],
            hasMany: [{ name: "contactPersons", fkProperty: "contractorID" }, "contracts", "physicalDetails", "legalDetails", "contractorFiles", "contractorNotes"]
        }, {
            name: "contractorFiles",
            properties: ["fileName", "url", "fileID", "contractorID", "size"],
            belongs: ["file"]
        }, {
            name: "files",
            properties: ["name", "size"]
        }, {
            name: "contactPersons",
            properties: ["archived", "comments", "contractorID", "deleted", "isMain", "name", "patronymic", "position", "surname", "isSigner", "typeID", "genderID", "birthDate"],
            belongs: [{ name: "contractor" }, { name: "type", setName: "refbooks" }, { name: "gender", setName: "statbooks" }],
            hasMany: [{ name: "contacts", fkProperty: "personID" }]
        }, {
            name: "contacts",
            properties: ["typeID", "text", "personID", "comments"],
            belongs: [{ name: "person", setName: "contactPersons" }, { name: "type", setName: "contactTypes" }]
        }, {
            name: "contactTypes",
            properties: ["name", "sysName", "parentID", "deleted", "orderNumber"],
            belongs: [{ name: "parent", setName: "contactTypes" }]
        }, {
            name: "contractorTypes",
            properties: ["name", "sysName"]
        }, {
            name: "contractorSubTypes",
            properties: ["name", "sysName", "deleted", "orderNumber", "typeID", "roleID", "needDepartment"]
        }, {
            name: "contracts",
            properties: ["comments", "contractorID", "createDate", "creatorID", "dateSign", "number", "originalExists", "projectID", "roleID", "dateEnd"],
            belongs: [{ name: "contractor" }]
        }, {
            name: "physicalDetails",
            properties: ["contractorID", "comments", "email", "name", "passportIssueDate", "passportIssuer", "passportNumber", "passportSerie", "passportSubcode", "patronymic", "phone", "surname", "registerAddress", "liveAddress", "inn"]
        }, {
            name: "legalDetails",
            properties: ["bankAccount", "bankBik", "bankLoroAccount", "bankName", "boss", "contractorID", "fullName", "inn", "kpp", "legalAddress", "name", "ogrn", "realAddress", "certificate", "accountant", "phone", "fax"]
        }, {
            name: "refbooks",
            properties: ["name", "deleted", "typeID", "orderNumber"]
        }, {
            name: "statbooks",
            properties: ["name", "deleted", "typeID", "orderNumber"]
        }, {
            name: "contractorNotes",
            properties: ["contractorID", "creatorID", "date", "description", "typeID", "typeName", "creatorName", "dateTime"],
            belongs: [{ name: "type", setName: "refbooks" }]
        }, {
            name: "contractorStatuses", className: "contractorStatus",
            properties: ["name", "color", "orderNumber", "roleID"]
        }, {
            name: "informationSources",
            properties: ["name", "sysName", "parentID", "deleted", "orderNumber"]
        }, {
            name: "users",
            properties: ["fullName", "managerFee", "roleID", "deleted", "blocked"]
        }, {
            name: "departments",
            properties: ["comments", "name", "deleted", "orderNumber"]
        }]
    });

    data = toJsObject(data);
    koModel.filter.role(data.roleID);
    koModel.filter.statusID(data.statusID);
    //koModel.filter.role.subscribe(function (value) {
    //    if (value == 1) {
    //        document.title = "Клиенты";
    //    } else if (value == 2) {
    //        document.title = "Субподрядчики";
    //    } else {
    //        document.title = "Другие специалисты";
    //    }
    //    koModel.refresh();
    //});

    model.events.koCreated.attach(function (e) {
        if (e.className == "contractor") {
            e.ko.include(["contactPersons", "contracts", "type", "physicalDetails", "legalDetails", "contractorFiles", "contractorNotes", "status", "source", "responsible", "subType", "department"]);
            e.ko.contractorNotes.total = ko.obs(0);
            e.ko.mainContactPerson = ko.cmp(function () {
                var cp = e.ko.contactPersons().first("val=>val.isMain()");
                return cp;
            });

            e.ko.flname = ko.cmp(function () {
                return z.filter.markMatches(e.ko.name(), koModel.filter.text());
            });

            e.ko.fladdress = ko.cmp(function () {
                return z.filter.markMatches(e.ko.address(), koModel.filter.text());
            });

            e.ko.filesLoaded = ko.obs(false);
            e.ko.loaded = ko.obs(false);
            if (e.ko.id() < 0) {
                e.ko.loaded(true);
                e.ko.filesLoaded = ko.obs(true);
            }
            e.ko.details = ko.cmp(function () {
                var type = e.ko.typeID();
                return type == 1 ? e.ko.physicalDetails().first() : e.ko.legalDetails().first();
            });
        } else if (e.className == "contactPerson") {
            e.ko.include(["type", "contacts", "gender"]);
            e.ko.newContactFocused = ko.obs(false);

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
        } else if (e.className == "contact") {
            e.ko.include(["type", "person"]);
            e.ko.text.subscribe(function (value) {
                if (!value) {
                    e.ko.entity.remove();
                } else if (!e.ko.entity.attached && !(e.ko.id() > 0)) {
                    e.ko.id(model.getMinID());
                    model.contacts.insert(e.ko.entity);
                    e.ko.person().newContactFocused(true);
                }
            });
        } else if (e.className == "contractorFile") {
            e.ko.include("file");
            e.ko.sizeText = ko.cmp(function () {
                var size = e.ko.size();

                if (size < 1000) {
                    return size + " б";
                } else if (size < 1000000) {
                    return parseInt(size / 1000) + " кб";
                } else if (size < 1000000000) {
                    return parseInt(size / 100000) / 10 + " мб";
                }
            });
            if (e.ko.id() < 0) {
                e.ko.contractorID(koModel.contractor.selected().id());
            }
        } else if (e.className == "contractorNote") {
            e.ko.include(["type"]);
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.activeRefbooks = function (id, tid) {
        var refbooks = koModel.refbooks().where("val=>val.typeID()==" + tid);
        refbooks = refbooks.where("val=>!val.deleted()||val.id()=='" + id + "'").orderBy("val=>val.orderNumber()");
        return refbooks;
    };
    koModel.activeStatbooks = function (id, tid) {
        var statbooks = koModel.statbooks().where("val=>val.typeID()==" + tid);
        statbooks = statbooks.where("val=>!val.deleted()||val.id()=='" + id + "'").orderBy("val=>val.orderNumber()");
        return statbooks;
    };
    koModel.contactPersonTypes = function (id) { return koModel.activeRefbooks(id, koModel.refbookTypes.contactPersonTypes); };
    koModel.contractorNoteTypes = function (id) { return koModel.activeRefbooks(id, koModel.refbookTypes.contractorNoteTypes); };
    koModel.genders = function (id) { return koModel.activeStatbooks(id, koModel.statbookTypes.genders); };
    koModel.activeSubTypes = function (id, tid, rid) { return koModel.contractorSubTypes.getActive(id)().where("val=>val.typeID()=='" + tid + "'&&(!val.roleID()||val.roleID()=='" + rid + "')"); };

    koModel.pager = new ejs.remotePager({
        set: model.contractors,
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
            property: "roleID",
            value: koModel.filter.role,
            type: "number"
        }, {
            property: "statusID",
            value: koModel.filter.statusID,
            type: "number"
        }, {
            property: "typeID",
            value: koModel.filter.typeID,
            type: "number"
        }, {
            value: function () { return isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%"; },
            condition: "like", type: "group", property: "group",
            filters: [{ property: "name", type: "string", operand: "or" }, { property: "address", type: "string", operand: "or" }]
        }],
        includes: [ejs.cip(model.contactPersons, true, ejs.cip(model.contacts, true))]
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.loadContracts = function (callback) {
        var contractor = koModel.contractor.selected();
        if (!contractor || contractor.loaded()) {
            if (typeof callback == "function")
                callback();
            return;
        }
        top.busy("loadingContracts");
        model.contracts.getChildren(contractor.id(), "contractorID", function () {
            top.free("loadingContracts");
            contractor.loaded(true);
            if (typeof callback == "function")
                callback();
        }, [ejs.cwp("roleID", 3, "==", "number")]);
    };

    koModel.loadNotes = function (callback) {
        var contractor = koModel.contractor.selected();
        var skip = contractor.contractorNotes().length;
        if (!contractor || contractor.loaded() && contractor.contractorNotes.total() <= skip) {
            if (typeof callback == "function")
                callback();
            return;
        }
        var options = ejs.cso(model.contractorNotes, [ejs.cwp("contractorID", contractor.id(), "==", "number")], [ejs.cop("ID", true)], 5, skip);
        top.busy("loadingNotes");
        model.select(options, function (result) {
            top.free("loadingNotes");
            if (skip == 0) {
                contractor.contractorNotes.total(result.totalCount);
            }
            model.addData(result.collections);
            contractor.loaded(true);
            if (typeof callback == "function")
                callback();
        });
    };

    koModel.updateAll = function (callback) {
        var contractor = koModel.contractor.selected();
        if (contractor) {
            var details = contractor.typeID() == 1 ? contractor.legalDetails() : contractor.physicalDetails();
            details.forEach(function (it) {
                it.entity.remove();
            });
        }

        top.busy("UpdateContractors");
        model.update(function () {
            top.free("UpdateContractors");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    koModel.restoreAll = function () {
        model.cancelChanges();
    };

    koModel.filter.archived.subscribe(function () {
        koModel.pager.goTo(0);
    });
    koModel.filter.text.subscribe(function () {
        koModel.pager.goTo(0);
    });

    koModel.filter.statusID.subscribe(function () {
        koModel.pager.goTo(0);
    });

    koModel.filter.typeID.subscribe(function () {
        koModel.pager.goTo(0);
    });

    koModel.loadAll = function () {
        koModel.pager.setting.pageSize = -1;
        koModel.pager.refresh();
    };

    koModel.refresh = function () {
        koModel.pager.goTo(0);
    };

    koModel.contractor.edit = function (contractor) {
        if (!contractor) {
            contractor = koModel.contractor.selectedArray().first();
        }

        if (!contractor) {
            return;
        }
        koModel.contractor.selected(contractor);
        if (!contractor.loaded()) {
            koModel.loadNotes(function () {
                koModel.contractor.edit(contractor);
                return;
            });
        }
        $(koModel.dialog.contractor.id).dialog("open");
    };

    koModel.contractor.open = function (contractor) {
        if (!contractor) {
            contractor = koModel.contractor.selectedArray().first();
        }

        if (!contractor) {
            return;
        }
        window.open(host.arp + "Customer/Index/" + contractor.id(), "_blank");
    };

    koModel.contractor.create = function () {
        var contractor = model.contractors.create();
        contractor.roleID(koModel.filter.role());
        contractor.statusID(koModel.filter.statusID());
        koModel.contractor.edit(contractor.toKo());
        koModel.createContactPerson();
    };

    koModel.contractor.remove = function (contractor) {
        if (contractor.entity) {
            koModel.contractor.selectedArray([]);
            koModel.contractor.selectedArray.push(contractor.id());
        }

        var names = koModel.filter.role() == 1 ? ["клиента", "клиентов", "клиентов"] : koModel.filter.role() == 2 ? ["субподрядчика", "субподрядчиков", "субподрядчиков"] : ["специалиста", "специалистов", "специалистов"];
        var contractors = koModel.contractor.selectedArray().select(function (it) { return koModel.contractors().first("val=>val.id()==" + it); });
        var message = ["Вы действительно хотите удалить ",
                       contractors.length == 1 ? names[0] + " " + contractors[0].name() : contractors.length + " " + i18n.declineCount(contractors.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (!confirm(message)) {
            return;
        }
        contractors.forEach(function (it) {
            it.deleted(true);
        });
        koModel.updateAll(function () {
            contractors.forEach(function (it) {
                it.entity.detach();
            });
            koModel.contractor.selectedArray([]);
        });
    };

    koModel.toggleArchived = function () {
        var contractors = koModel.contractor.selectedArray().select(function (it) { return koModel.contractors().first("val=>val.id()==" + it); });
        if (!contractors.any())
            return;
        if (koModel.filter.archived()) {
            koModel.unarchiveContractors(contractors);
        } else {
            koModel.archiveContractors(contractors);
        }
    };

    koModel.archiveContractors = function (contractors) {
        var message = [];
        message.push("Вы уверены, что хотите перевести ");
        message.push(contractors.length == 1 ? "Клиента " + contractors[0].name() : contractors.length + " " + i18n.declineCount(contractors.length, "клиента", "клиентов", "клиентов"));
        message.push(" в архив?\n");
        message = message.join("");

        //if (needConfirm && !confirm(message)) {
        //    return;
        //}

        contractors.forEach(function (it) {
            it.archived(true);
        });
        koModel.updateAll(function () {
            contractors.forEach(function (it) {
                it.entity.detach();
            });
            koModel.contractor.selectedArray([]);
        });
    };

    koModel.unarchiveContractors = function (contractors) {
        contractors.forEach(function (it) {
            it.archived(false);
        });
        koModel.updateAll(function () {
            contractors.forEach(function (it) {
                it.entity.detach();
            });
            koModel.contractor.selectedArray([]);
        });
    };

    koModel.detailsTabChanged = function (e, a) {
        var i = a.index;
        var c = koModel.contractor.selected();
        if (i == 1) {
            var type = c.typeID();
            var details = c.details();
            var eSet = type == 1 ? model.physicalDetails : model.legalDetails;
            if (!details) {
                if (c.id() < 0) {
                    eSet.create().contractorID(c.id());
                } else {
                    eSet.getChildren(c.id(), "contractorID", function (result) {
                        var details = c.details();
                        if (!details) {
                            eSet.create().contractorID(c.id());
                        }
                    });
                }
            }
        } else if (i == 3) {
            if (c.id() > 0 && !c.filesLoaded()) {
                model.contractorFiles.getChildren(c.id(), "contractorID", function (result) {
                    c.filesLoaded(true);
                });
            }
        }
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
        var contractors = koModel.contractors();
        var role = koModel.filter.role();
        if (koModel.contractor.selectedArray().any()) {
            contractors = koModel.contractor.selectedArray().select(function (it) { return contractors.first("val=>val.id()==" + it); });;
        }
        var headers = ["Название", "Фамилия", "Имя", "Отчество", "Адрес", "Тип", "Телефон", "Email", "Контактное лицо", "Фамилия", "Имя", "Отчество", "Контакты", "Примечание"];

        var name = [koModel.filter.archived() ? "Архивные_" : "", role == 1 ? "Клиенты_" : role == 2 ? "Проектировщики_" : "Специалисты_", (new Date()).toSds()].join("");
        var rows = contractors.select(function (it) {
            var contactPerson = it.mainContactPerson();
            var contacts = "";
            var cpnames = [];
            if (contactPerson) {
                contactPerson.contacts().forEach(function (val) { contacts += val.type().name() + ": " + val.text() + " \n"; });
                cpnames = [contactPerson.surname(), contactPerson.name(), contactPerson.patronymic()];
            }
            var names = it.typeID() == host.contractorTypes.person ? it.name().trim().split(" ") : [];
            return [it.name(), names[0], names[1], names[2], it.address(), it.type().name(), it.phone(), it.email(), contactPerson ? contactPerson.fullName() : "", cpnames[0], cpnames[1], cpnames[2], contacts, it.comments()];
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    koModel.dialog.contractor.close = function (result) {
        koModel.dialog.contractor.result(result);
        $(koModel.dialog.contractor.id).dialog("close");
    };

    koModel.dialog.contractor.onClosed = function () {
        var c = koModel.contractor.selected();
        var result = koModel.dialog.contractor.result();
        if (result) {
            //c.mainContactName("");
            //c.mainContactsText("");
            var d = new Date();
            c.changeDate(d.toSds() + " " + d.toLocaleTimeString());

            koModel.updateAll();
        } else {
            koModel.restoreAll();
        }
        koModel.contractor.selected(null);
    };

    koModel.createContactPerson = function () {
        var contractor = koModel.contractor.selected();
        var person = model.contactPersons.create();
        person.contractorID(contractor.id());
        if (contractor.contactPersons().length == 1) {
            person.isMain(true);
            if (contractor.typeID() == host.contractorTypes.person && contractor.name()) {
                var names = contractor.name().split(" ");
                person.surname(names[0]);
                person.name(names[1]);
                person.patronymic(names[2]);
            }
        }
    };

    koModel.getEmptyContact = function (person) {
        var last = person.contacts().last();
        var contact = (new model.contact()).toKo();
        var id = contact.id();
        contact.personID(person.id());
        if (last) {
            contact.typeID(last.typeID());
        }
        return contact;
    };

    koModel.removeContactPerson = function (row) {
        var message = ["Вы действительно хотите удалить контактное лицо ",
            row.fullName(),
            row.contacts().any() ? " и все его контакты" : "", "?"].join("");

        if ((row.id() < 0 && !row.contacts().any()) || confirm(message)) {
            row.contacts().forEach(function (val) { val.entity.remove(); });
            row.entity.remove();
        }
    };

    koModel.createFrameContract = function (contractor) {
        var contract = model.contracts.create();
        contract.contractorID(contractor.id());
        contract.roleID(3);
    };

    koModel.removeFrameContract = function (contract) {
        if (contract.id() > 0 && !confirm("Вы действительно хотите удалить рамочный договор №" + contract.number() + "?"))
            return;
        contract.entity.remove();
    };

    koModel.createNote = function (contractor) {
        var note = model.contractorNotes.create();
        note.contractorID(contractor.id());
        contractor.contractorNotes.total(contractor.contractorNotes.total() + 1);
    };

    koModel.removeNote = function (row) {
        var contractor = koModel.contractor.selected();
        if (row.id() > 0 && !confirm("Вы действительно хотите удалить заметку " + row.dateTime() + "?"))
            return;
        row.entity.remove();
        contractor.contractorNotes.total(contractor.contractorNotes.total() - 1);
    };

    koModel.addFile = function () {
        var cf = model.contractorFiles.create().toKo();
        var f = model.files.create().toKo();
        cf.fileID(f.id());
    };
    koModel.removeFile = function (row) {
        if (row.id() < 0 || confirm("Вы действительно хотите удалить приложение " + row.fileName() + "?")) {
            if (row.file()) {
                row.file().entity.remove();
            }
            row.entity.remove();
        }
    };

    koModel.selectFile = function (row) {
        var id = row.id();
        var frm = $("#frmUploadContractorFile" + id);
        var txt = frm.contents().find("input[type=file]");
        txt.click();
    };

    if (!window.onFileSelected) {
        window.onFileSelected = ejs.createEvent();
    }
    window.onFileSelected.attach(function (f) {
        if (!f.name.startsWith("contractorFile")) {
            return;
        }
        var id = f.name.split("_")[1];
        var file = koModel.contractor.selected().contractorFiles().first("val=>val.id()==" + id);
        file.file().name(f.value);
        file.fileName(f.value);
    });

    if (!window.onFileUploaded) {
        window.onFileUploaded = ejs.createEvent();
    }
    var filesInProgress = [];
    window.onFileUploaded.attach(function (item) {
        if (!item.name.startsWith("contractorFile")) {
            return;
        }
        if (!filesInProgress.contains(item.name)) {
            return;
        }
        //debugger;
        var id = item.name.split("_")[1];
        var cf = koModel.contractor.selected().contractorFiles().first("val=>val.id()==" + id);
        var file = cf.file();
        if (item.code == 200) {
            file.id(item.file.id);
            file.name(item.file.name);
            cf.fileName(item.file.name);
            cf.fileID(file.id());

            filesInProgress.removeEl(item.name);
            if (!filesInProgress.length) {
                koModel.dialog.contractor.close(true);
            }
        } else {
            alert(item.message);
        }
        if (!filesInProgress.length) {
            top.free("FileUpload");
        }
    });

    koModel.uploadFiles = function () {
        var frms = $("#divFilesTab").find("iframe.upload").toArray();
        if (!frms.length) {
            return false;
        }
        filesInProgress = [];
        frms.forEach(function (frm) {
            var f = $(frm).contents().find("form");
            var txt = f.find("input[type=file]");
            var hdn = f.find("input[name=FileID]");
            var n = txt.attr("name");

            //hdn.val(options.koModel[options.names.obsName]()[n]());
            filesInProgress.push(n);
        });
        frms.forEach(function (frm) {
            var f = $(frm).contents().find("form");
            f.submit();
        });
        top.busy("FileUpload");
        return true;
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblContractors").koGrid({
        koTemplateID: "trContractor",
        headerContainer: $("#divContractorsHeader"),
        styleID: "stlContractorsGrid",
        tableID: "tblContractors",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        //source: koModel.project.rows,
        disallowSort: ["Save", "Select", "ContactPerson", "Contacts"]
    });

    ko.apply(koModel);

    koModel.pager.goTo(0);
    loadHtml(koModel, model, data);
});

function loadHtml(koModel, model, data) {
    $.ajax({
        url: ApplicationRootPath + "Contractor/Details",
        data: { date: new Date() },
        success: function (result) {

            var div = $(koModel.dialog.contractor.id);
            div.html(result);

            div.dialog({
                title: "Информация по контрагенту",
                width: 790,
                buttons: [{
                    text: 'OK', click: function () {
                        //debugger;
                        var c = koModel.contractor.selected();
                        var tabs = div.find(".tabs.details");
                        for (var i = 0; i < 4; i++) {
                            if (i == 1 && !c.details()) {
                                continue;
                            } else if (i == 3 && !c.contractorFiles().any("val=>val.id()<0")) {
                                continue;
                            }

                            var valid = true;
                            tabs.tabs().tabs('option','active', i);
                            div.find("form").each(function () { valid = valid & $(this).valid(); });
                            if (!valid) {
                                return;
                            }
                        }
                        if (!koModel.uploadFiles()) {
                            koModel.dialog.contractor.close(true);
                        }
                    }
                }, { text: 'Отмена', click: function () { koModel.dialog.contractor.close(false); } }],
                modal: true,
                autoOpen: false,
                open: function () {
                    var tabs = div.find(".tabs.details");
                    tabs.tabs().tabs({ active: 0 });
                    koModel.dialog.contractor.result("");
                    var role = koModel.filter.role();
                    div.dialog({ title: role == 1 ? "Информация по клиенту" : role == 2 ? "Информация по субподрядчику" : "Информация по специалисту" });
                },
                close: function () {
                    if (typeof koModel.dialog.contractor.onClosed == "function") {
                        //debugger;
                        koModel.dialog.contractor.onClosed();
                    }
                }
            });

            var parent = div.parents(".ui-dialog:first");
            parent.addClass("ui-tabs-dialog");
            div.data().uiDialog.options.open('option', 'draggable', {
                cancel: '.ui-dialog-titlebar-close, .ui-tabs-panel',
                handle: '.ui-tabs-nav, .ui-dialog-titlebar, .ui-dialog-content'
            });

            if (data.statusID) {
                $("#trStatusSelect").remove();
            }

            //ko.apply(koModel, div.get(0));
        }
    });

}