var contractorsDialogKoModel = {
    selected: {
        id: ko.obs(""),
        name: ko.obs(""),
        address: ko.obs("")
    },
    refbookTypes: { contactPersonTypes: 2, contractorNoteTypes: 3 },
    statbookTypes: { genders: 2 },
    filter: { text: ko.obs(""), id: ko.obs(""), type: ko.obs(""), subType: ko.obs(""), role: ko.obs(""), projectID: ko.obs(""), name: ko.obs(""), address: ko.obs(""), spec: ko.obs(""), phone: ko.obs(""), dep: ko.obs("") },
    tab: ko.obs(1),
    result: ko.obs(""),
    contractor: ko.obs(null),
    onClosed: ko.obs(null),
    title: ko.obs(""),
    mode: ko.obs("")
};

function initContractorsDialog() {
    var div = $("#divContractorsDialog");
    var context = contractorsDialogKoModel;
    if (koModel && !koModel.contractorsDialogKoModel) {
        koModel.contractorsDialogKoModel = context;
    }
    var koModel = context;
    var data = ejs.toJsObject(eval("(" + $("#scrContractorsDialogData").text() + ")"));
    var model = new ejs.model({
        sets: [{
            name: "contractors",
            properties: ["address", "changeDate", "changerID", "createDate", "creatorID", "deleted", "name", "roleID", "typeID", "mainContactName", "mainContactsText", "comments", "specialization",
                "statusID", "description", "sourceID", "creatorName", "responsibleID", "subTypeID", "phone", "departmentID"],
            hasMany: ["contactPersons", "contracts", "physicalDetails", "legalDetails", "contractorFiles", "contractorNotes"],
            belongs: [{ name: "type", setName: "contractorTypes" }, { name: "subType", setName: "contractorSubTypes" }, "department"]
        }, {
            name: "contractorFiles",
            properties: ["fileName", "url", "fileID", "contractorID", "size"],
            belongs: ["file"]
        }, {
            name: "files",
            properties: ["name", "size"]
        }, {
            name: "contractorTypes",
            properties: ["name", "sysName"]
        }, {
            name: "contractorSubTypes",
            properties: ["name", "sysName", "deleted", "orderNumber", "typeID", "roleID", "needDepartment"]
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
    })

    model.events.koCreated.attach(function (e) {
        if (e.className == "contractor") {
            e.ko.include(["contactPersons", "contracts", "physicalDetails", "legalDetails", "contractorFiles", "contractorNotes", "type", "subType", "department"]);
            e.ko.contractorNotes.total = ko.obs(0);
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
                e.ko.contractorID(koModel.contractor().id());
            }
        } else if (e.className == "contractorNote") {
            e.ko.include(["type"]);
        }
    });

    model.refreshData(data);
    model.toKo(context);
    context.getModel = function () { return model; };

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

    context.filter.likeText = ko.cmp(function () {
        return context.filter.text() ? "%" + context.filter.text() + "%" : "";
    });

    context.pager = new ejs.remotePager({
        set: model.contractors,
        model: model,
        pageSize: 20,
        filters: [{
            value: context.filter.likeText,
            condition: "like", type: "group", property: "group",
            filters: [{ property: "name", type: "string", operand: "or" }, { property: "phone", type: "string", operand: "or" }, { property: "specialization", type: "string", operand: "or" },
             { property: "type.Name", type: "string", operand: "or" }, { property: "subType.Name", type: "string", operand: "or" }]
        }, {
            value: context.filter.id,
            condition: "=", type: "number", property: "id"
        }, {
            value: context.filter.type,
            condition: "=", type: "number", property: "typeID"
        }, {
            value: context.filter.subType,
            condition: "=", type: "number", property: "subTypeID"
        }, {
            value: context.filter.role,
            condition: "=", type: "number", property: "roleID"
        }, {
            value: context.filter.dep,
            condition: "=", type: "number", property: "departmentID"
        }, {
            value: function () {
                return context.filter.name() ? "%" + context.filter.name() + "%" : "";
            }, condition: "like", property: "name"
        }, {
            value: function () {
                return context.filter.address() ? "%" + context.filter.address() + "%" : "";
            }, condition: "like", property: "address"
        }, {
            value: function () {
                return context.filter.phone() ? "%" + context.filter.phone() + "%" : "";
            }, condition: "like", property: "phone"
        }, {
            value: function () {
                return context.filter.spec() ? "%" + context.filter.spec() + "%" : "";
            }, condition: "like", property: "specialization"
        }, {
            value: function () { return context.filter.id() > 0 ? null : false; },
            condition: "=", type: "bool", property: "deleted"
        }, {
            value: function () { return context.filter.role() == 2 ? context.filter.projectID() : ""; },
            condition: "=", type: "number", property: "forProject"
        }],
        includes: [ejs.createIncludeParameter(model.contactPersons, true, ejs.createIncludeParameter(model.contacts, true))]
    });
    context.pager.orderBy("name");

    context.pager.loading.subscribe(function (value) {
        context.selected.id("");
    });

    context.loadContracts = function (callback) {
        var contractor = context.contractor();
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
        var contractor = koModel.contractor();
        var skip = contractor.contractorNotes().length;
        contractor.contractorNotes.total = contractor.contractorNotes.total || ko.obs(0);
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

    context.clear = function () {
        if (context.contractor() && (!context.contractor().entity || context.contractor().id() > 0)) {
            context.contractor(null);
        }

        context.filter.id("");
        context.filter.text("");
        context.filter.type(null);
        context.filter.subType(null);
        context.filter.dep(null);
        context.filter.role("");
        context.selected.id("");
        context.mode("");
        context.result("");
        model.cancelChanges();
        model.refreshData({ contractors: [], contactPersons: [], contacts: [] });
    };

    context.applyFilter = function (data, event) {
        if (event.keyCode == 13 || event.which == 13) {
            var element = $(event.target);
            setTimeout(function () {
                element.change();
                //element.blur();
                context.pager.refresh();
            }, 100);
        }
        return true;
    };

    context.createContactPerson = function () {
        var contractor = koModel.contractor();
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

    context.getEmptyContact = function (person) {
        var last = person.contacts().last();
        var contact = (new model.contact()).toKo();
        var id = contact.id();
        contact.personID(person.id());
        if (last) {
            contact.typeID(last.typeID());
        }
        return contact;
    };

    context.removeContactPerson = function (row) {
        var message = ["Вы действительно хотите удалить контактное лицо ",
            row.fullName(),
            row.contacts().any() ? " и все его контакты" : "", "?"].join("");

        if ((row.id() < 0 && !row.contacts().any()) || confirm(message)) {
            row.contacts().forEach(function (val) { val.entity.remove(); });
            row.entity.remove();
        }
    };

    context.createFrameContract = function (contractor) {
        var contract = model.contracts.create();
        contract.contractorID(contractor.id());
        contract.roleID(3);
    };

    context.removeFrameContract = function (contract) {
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
        var contractor = koModel.contractor();
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

    context.detailsTabChanged = function (e) {
        var i = e.index;
        var c = context.contractor();
        if (i == 1) {
            var type = c.typeID();
            var details = c.details();
            var eSet = type == 1 ? model.physicalDetails : model.legalDetails;
            if (!details) {
                if (c.id() < 0) {
                    eSet.create().contractorID(c.id());
                } else {
                    top.busy("ContractoDetails");
                    eSet.getChildren(c.id(), "contractorID", function (result) {
                        top.free("ContractoDetails");
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

    div.find("form").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement
    });

    context.show = function (title, id) {
        if (title) {
            context.title(title);
        }
        if (id) {
            context.tab(0);
            context.filter.text("");
            context.mode("edit");
            context.filter.id(id);
        } else {
            context.contractor(null);
            context.tab(1);
            //var contractor = model.contractors.create().toKo();
            //contractor.typeID(context.filter.type());
            //context.contractor(contractor);
        }
        context.pager.refresh(function () {
            if (context.mode() == "edit") {
                var first = context.contractors().first();
                context.contractor(first);
                if (first && first.roleID() == 1) {
                    context.loadNotes();
                }
            }
        });

        var f = koModel.filter;
        f.dep(f.role() == 1 ? "" : f.dep());
        var fn = function () {
            setTimeout(function () {
                context.pager.refresh();
            }, 100);
        };

        f.address.subs = f.address.subscribe(fn);
        f.phone.subs = f.phone.subscribe(fn);
        f.name.subs = f.name.subscribe(fn);
        f.spec.subs = f.spec.subscribe(fn);
        f.subType.subs = f.subType.subscribe(fn);
        f.text.subs = f.text.subscribe(fn);
        f.type.subs = f.type.subscribe(fn);
        f.dep.subs = f.dep.subscribe(fn);

        div.dialog({ title: context.title() });
        div.dialog("open");
        return context.onClosed;
    };

    context.create = function () {
        model.cancelChanges();
        if (!context.contractor() || !context.contractor().entity) {
            var contractor = model.contractors.create().toKo();
            contractor.typeID(context.filter.type());
            contractor.roleID(context.filter.role());
            context.contractor(contractor);
        }
        context.tab(0);
    };

    context.choose = function () {
        model.cancelChanges();
        context.contractor(null);
        context.tab(1);
    };

    context.close = function (result) {
        if ((result && context.tab() == 0 && !div.find("form").valid())) {
            return;
        }
        var f = koModel.filter;
        for (var i in f) {
            if (f[i] && f[i].subs)
                f[i].subs.dispose();
        }

        if (result && context.tab() == 0) {
            if (!context.contractor().entity.attached) {
                context.contractor().id(model.getMinID());
                model.contractors.insert(context.contractor().entity);
            }
            var c = context.contractor();
            c.mainContactName("");
            c.mainContactsText("");
            var d = new Date();
            c.changeDate(d.toSds() + " " + d.toLocaleTimeString());

            var details = c.typeID() == 1 ? c.legalDetails() : c.physicalDetails();
            details.forEach(function (it) {
                it.entity.remove();
            });

            top.busy("addParent");
            model.update(function () {
                top.free("addParent");
                context.selected.id(context.contractor().id())
                context.result(true);
                div.dialog("close");
            });
            return;
        } else if (result && context.selected.id()) {// 
            context.result(true);
        } else {
            context.result(false);
            model.clearChanges();
        }

        div.dialog("close");
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
        var file = koModel.contractor().contractorFiles().first("val=>val.id()==" + id);
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
        var cf = koModel.contractor().contractorFiles().first("val=>val.id()==" + id);
        var file = cf.file();
        if (item.code == 200) {
            file.id(item.file.id);
            file.name(item.file.name);
            cf.fileName(item.file.name);
            cf.fileID(file.id());

            filesInProgress.removeEl(item.name);
            if (!filesInProgress.length) {
                context.close(true);
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
    
    div.dialog({
        title: "Выбрать/создать контрагента",
        width: 790,
        //position: { my: "center top", at: "center top" },
        buttons: [
            {
                text: 'OK', click: function () {
                    //debugger;
                    var c = context.contractor();
                    if (!c || !c.entity) {
                        context.close(true);
                        return;
                    }

                    var tabs = div.find(".tabs.details");
                    for (var i = 0; i < 4; i++) {
                        if (i == 1 && !c.details()) {
                            continue;
                        } else if (i == 3 && !c.contractorFiles().any("val=>val.id()<0")) {
                            continue;
                        }

                        var valid = true;
                        tabs.tabs("option", 'active', i);
                        div.find("form").each(function () { valid = valid & $(this).valid(); });
                        if (!valid) {
                            return;
                        }
                    }
                    if (!koModel.uploadFiles()) {
                        context.close(true);
                    }
                }
            },
            { text: 'Отмена', click: function () { context.close(false); } }
        ],
        modal: true,
        autoOpen: false,
        open: function () {

        },
        close: function () {
            if (typeof context.onClosed() == "function") {
                context.onClosed()(context.result(), context.selected);
            }
            context.clear();
        }
    });

    var parent = div.parents(".ui-dialog:first");
    parent.addClass("ui-tabs-dialog");
    //div.data('dialog').uiDialog.draggable('option', {
    //    cancel: '.ui-dialog-titlebar-close, .ui-tabs-panel',
    //    handle: '.ui-tabs-nav, .ui-dialog-titlebar, .tabs.header'
    //});

    ko.apply(context, div.get(0));
}

$(initContractorsDialog);