var koModel = {
    filter: { contractRoleID: ko.obs(1) },
    selected: {
        itabID: ko.obs(1),
        itab: ko.obs(""),
        contractPageID: ko.obs(""),
        view: ko.obs("works")
    },
    itabs: ko.obsa([{
        id: 1,
        name: "основная информация"
    }, {
        id: 2,
        name: "договора"
    }]),
    refbookTypes: { contactPersonTypes: 2, contractorNoteTypes: 3 },
    statbookTypes: { genders: 2 },
    worksImport: { fileID: ko.obs(""), fileName: ko.obs(""), codeColumn: ko.obs(1), nameColumn: ko.obs(2), unitColumn: ko.obs(3), priceColumn: ko.obs(4) },
    years: ko.obsa([]),
    contractorFile: ko.obs(""),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "contractors",
            properties: ["address", "changeDate", "changerID", "createDate", "creatorID", "deleted", "name", "roleID", "typeID", "comments", "specialization", "statusID", "archived", "description", "sourceID", "creatorName", "responsibleID", "subTypeID"],
            belongs: [{ name: "type", setName: "contractorTypes" }, { name: "status", setName: "contractorStatuses" }],
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
            properties: ["comments", "contractorID", "createDate", "creatorID", "dateSign", "number", "originalExists", "projectID", "roleID", "dateEnd", "deleted"],
            belongs: [{ name: "contractor" }]
        }, {
            name: "physicalDetails",
            properties: ["contractorID", "comments", "email", "name", "passportIssueDate", "passportIssuer", "passportNumber", "passportSerie", "passportSubcode", "patronymic", "phone", "surname", "registerAddress", "liveAddress", "inn"]
        }, {
            name: "legalDetails",
            properties: ["bankAccount", "bankBik", "bankLoroAccount", "bankName", "boss", "contractorID", "fullName", "inn", "kpp", "legalAddress", "name", "ogrn", "realAddress", "certificate", "accountant", "phone", "fax"]
        }, {
            name: "workTypes",
            properties: ["name", "orderNumber", "shortName", "sysName", "price", "code", "unitName"]
            //}, {
            //    name: "contractorWorks",
            //    properties: ["contractorID", "contractID", "price", "workTypeID", "pageID", "comments", "workName", "workPrice", "code", "unitName"],
            //    belongs: [{ name: "contract", setName: "contractorWorkContracts" }, "workType"]
            //}, {
            //    name: "contractorWorkContracts",
            //    properties: ["contractorID", "name", "orderNumber", "deleted", "sysName", "comments"],
            //    hasMany: [{ name: "pages", setName: "contractorWorkContractPages", fkProperty: "contractID" }]
            //}, {
            //    name: "contractorWorkContractPages",
            //    properties: ["contractorID", "contractID", "name", "orderNumber", "deleted", "sysName", "comments"]
            //}, {
            //    name: "demountTypes",
            //    properties: ["name", "orderNumber", "shortName", "sysName", "rate", "code", "unitName"]
            //}, {
            //    name: "contractorDemounts",
            //    properties: ["contractorID", "contractID", "rate", "demountTypeID", "pageID", "comments", "demountName", "demountRate", "code"],
            //    belongs: [{ name: "contract", setName: "contractorWorkContracts" }, "demountType"]
        }, {
            name: "contracts",
            properties: ["comments", "contractorID", "createDate", "creatorID", "dateSign", "number", "originalExists", "projectID", "roleID", "parentID", "dateEnd", "dateAdvance", "sumAdvance", "deleted"],
            belongs: [{ name: "project" }, { name: "contractor" }],
            //hasMany: [{ name: "acts" }]
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
        }]
    });

    data = ejs.toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "contractor") {
            e.ko.include(["contactPersons", "contracts", "type", "physicalDetails", "legalDetails", "contractorFiles", "contractorNotes", "status"]);
            e.ko.contractorNotes.total = ko.obs(0);
            e.ko.mainContactPerson = ko.cmp(function () {
                var cp = e.ko.contactPersons().first("val=>val.isMain()");
                return cp;
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

            e.ko.typeID.subscribe(function (value) {
                if (e.entity.inParse)
                    return;
                var details = e.ko.details();
                var eSet = value == 1 ? model.physicalDetails : model.legalDetails;
                if (!details) {
                    eSet.create().contractorID(e.ko.id());
                }
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
                e.ko.contractorID(koModel.customer.id());
            }
            //} else if (e.className == "contractorWork") {
            //    e.ko.include(["contract", "workType"]);
            //    ko.toDobs([e.ko.price, e.ko.workPrice]);
            //    e.ko.workTypeID.subscribe(function (value) {
            //        var work = e.ko.workType();
            //        if (!value || e.entity.inParse || !work)
            //            return;
            //        e.ko.workPrice(work.price());
            //        e.ko.code(e.ko.code() || work.code());
            //        e.ko.unitName(work.unitName());
            //    });
            //} else if (e.className == "contractorDemount") {
            //    e.ko.include(["contract", "demountType"]);
            //    ko.toDobs([e.ko.rate, e.ko.demountRate]);
            //    e.ko.demountTypeID.subscribe(function (value) {
            //        var demount = e.ko.demountType();
            //        if (!value || e.entity.inParse || !demount)
            //            return;
            //        e.ko.demountRate(demount.rate());
            //        e.ko.code(e.ko.code() || work.code());
            //    });
            //} else if (e.className == "contractorWorkContract") {
            //    e.ko.include(["pages"]);
        } else if (e.className == "contractorNote") {
            e.ko.include(["type"]);
        } else if (e.className == "contract") {
            //e.ko.include(["acts", "contractor"]);
            e.ko.name = ko.cmp(function () {
                return ["№", e.ko.number(), " (", e.ko.dateSign(), " -- ", e.ko.dateEnd(), ")"].join("");
            });
        }
    });

    koModel.customerID = data.customer.id;
    model.refreshData(data);
    model.contractors.addData([data.customer]);
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

    koModel.getModel = function () { return model; };
    koModel.customer = koModel.contractors().first();
    koModel.monthes = ko.obsa($.datepicker.regional['ru'].monthNames.select(function (it, i) {
        var result = {
            id: i + 1,
            name: it
        };

        return result;
    }));

    koModel.selectTab = function (row) {
        var oldTab = koModel.itabs().first("val=>val.id=='" + koModel.selected.itabID() + "'");
        var valid = true;
        if (oldTab) {
            $("form").each(function (it) { valid = valid & $(this).valid(); });
        }
        valid = valid;
        if (valid) {
            koModel.updateAll(function () {
                koModel.selected.itabID(row.id);
                koModel.selected.itab(row);
                koModel.refresh();
                setHeight();
            }, "");
        }
    };

    koModel.refresh = function (time) {
        if (koModel.hasChanges()) {
            if (time === 1) {
                return;
            }
            koModel.updateAll(function () { koModel.refresh(1); }, "");
            return;
        }
        if (koModel.selected.itabID() == 1) {
        } else if (koModel.selected.itabID() == 2 && !koModel.contracts().any()) {
            koModel.contractsCrud.refresh();
            //} else if (koModel.selected.itabID().toString().startsWith("contract_")) {
            //    koModel.cwCrud.refresh();
            //    koModel.cdCrud.refresh();
        }
    };

    koModel.updateAll = function (callback, showQtip) {
        var valid = true;
        $("form").each(function (it) { valid = valid & $(this).valid(); });
        if (!valid)
            return false;

        if (typeof koModel.valid == "function") {
            if (!koModel.valid()) {
                return;
            }
        }

        ejs.busy("UpdateCustomer");

        model.update(function (result) {
            ejs.free("UpdateCustomer");

            if (showQtip == false || result.canceled.any()) {
            } else if (showQtip == true || result.changes.updated.any() || result.changes.deleted.any()) {
                window.showTip("Данные успешно сохранены");
            }

            if (typeof callback == "function") {
                callback(result);
            }
        });
        return true;
    };

    koModel.addFile = function () {
        var cf = model.contractorFiles.create().toKo();
        var f = model.files.create().toKo();
        cf.fileID(f.id());
        koModel.contractorFile(cf);
        $("#divFileDialog").dialog("open");
    };
    koModel.removeFile = function (row) {
        if (confirm("Вы действительно хотите удалить файл " + row.fileName() + "?")) {
            if (row.file()) {
                row.file().entity.remove();
            }
            row.entity.remove();
            koModel.updateAll();
        }
    };

    koModel.createContactPerson = function () {
        var contractor = koModel.customer;
        var person = model.contactPersons.create();
        person.contractorID(contractor.id());
        if (contractor.contactPersons().length == 1) {
            person.isMain(true);
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
        var contractor = koModel.customer;
        var contract = model.contracts.create();
        contract.contractorID(contractor.id());
        contract.roleID(3);
    };

    koModel.removeFrameContract = function (contract) {
        if (contract.id() > 0 && !confirm("Вы действительно хотите удалить рамочный договор №" + contract.number() + "?"))
            return;
        if (contract.id() > 0) {
            contract.deleted(true);
        } else {
            contract.entity.remove();
        }
    };

    koModel.createNote = function (contractor) {
        var note = model.contractorNotes.create();
        note.contractorID(contractor.id());
        contractor.contractorNotes.total(contractor.contractorNotes.total() + 1);
    };

    koModel.removeNote = function (row) {
        var contractor = koModel.customer;
        if (row.id() > 0 && !confirm("Вы действительно хотите удалить заметку " + row.dateTime() + "?"))
            return;
        row.entity.remove();
        contractor.contractorNotes.total(contractor.contractorNotes.total() - 1);
    };

    koModel.loadNotes = function (callback) {
        var contractor = koModel.customer;
        var skip = contractor.contractorNotes().length;
        if (!contractor || contractor.loaded() && contractor.contractorNotes.total() <= skip) {
            if (typeof callback == "function")
                callback();
            return;
        }
        var options = ejs.cso(model.contractorNotes, [ejs.cwp("contractorID", contractor.id(), "==", "number")], [ejs.cop("ID", true)], 5, skip);
        ejs.busy("loadingNotes");
        model.select(options, function (result) {
            ejs.free("loadingNotes");
            if (skip == 0) {
                contractor.contractorNotes.total(result.totalCount);
            }
            model.addData(result.collections);
            contractor.loaded(true);
            if (typeof callback == "function")
                callback();
        });
    };

    //koModel.showWorks = function (contract) {
    //    if (contract.id() < 0)
    //        return;
    //    var id = "contract_" + contract.id();
    //    var tab = koModel.itabs().first("val=>val.id=='" + id + "'");
    //    if (!tab) {
    //        tab = { id: id, name: contract.name(), contractID: contract.id() };
    //        koModel.itabs.push(tab);
    //    }
    //    if (contract.pagesLoaded) {
    //        var page = contract.pages().orderBy("val=>val.orderNumber()").first();
    //        koModel.selected.contractPageID(page ? page.id() : "");
    //        koModel.selectTab(tab);
    //    } else {
    //        ejs.busy("contractPages");
    //        model.contractorWorkContractPages.select(function () {
    //            ejs.free("contractPages");
    //            contract.pagesLoaded = true;
    //            var page = contract.pages().orderBy("val=>val.orderNumber()").first();
    //            koModel.selected.contractPageID(page ? page.id() : "");
    //            koModel.selectTab(tab);
    //        }, [ejs.cwp("contractID", contract.id(), "=", "number")]);
    //    }
    //};

    //koModel.closeWorks = function () {
    //    var tab = koModel.selected.itab()
    //    koModel.itabs.remove(tab);
    //    koModel.selectTab(koModel.itabs().first("val=>val.id==2"));
    //};

    //koModel.clearWorks = function () {
    //    var contractID = koModel.selected.itab().contractID;
    //    var contract = koModel.cwcs().first("val=>val.id()==" + contractID);
    //    if (!confirm("Вы действительно хотите удалить все данные по договору " + contract.name() + "?\nВосстановить данные будет невозможно!")) {
    //        return;
    //    }
    //    ejs.busy("ClearWorks");
    //    $.rjson({
    //        url: host.arp + "Customer/ClearWorkContract/" + contract.id(),
    //        success: function (result) {
    //            ejs.free("ClearWorks");
    //            result = ejs.toJsObject(result);
    //            if (!result.success) {
    //                alert(result.error || "Непредвиденная ошибка!");
    //            }

    //            ejs.busy("contractPages");
    //            model.contractorWorkContractPages.refreshData([]);
    //            model.contractorWorkContractPages.select(function () {
    //                ejs.free("contractPages");
    //                contract.pagesLoaded = true;
    //                var page = contract.pages().orderBy("val=>val.orderNumber()").first();
    //                koModel.selected.contractPageID(page ? page.id() : "");
    //                koModel.refresh();
    //            }, [ejs.cwp("contractID", contract.id(), "=", "number")]);
    //        },
    //        error: function () {
    //            ejs.free("ClearWorks");
    //            alert("Непредвиденная ошибка!");
    //        }
    //    });
    //};

    //koModel.importWorks = function () {
    //    $("#divImportDialog").dialog("open");
    //};

    //koModel.importWorksSubmit = function () {
    //    var contractID = koModel.selected.itab().contractID;
    //    var contract = koModel.cwcs().first("val=>val.id()==" + contractID);
    //    var data = ejs.toServerObject(ko.toJS(koModel.worksImport));
    //    data.ID = contractID;
    //    ejs.busy("worksImport");
    //    $.rjson({
    //        url: host.arp + "Customer/ImportWorks",
    //        data: data,
    //        success: function (result) {
    //            ejs.free("worksImport");
    //            result = ejs.toJsObject(result);
    //            if (!result.success) {
    //                alert(result.error || "Непредвиденная ошибка!");
    //            }

    //            ejs.busy("contractPages");
    //            model.contractorWorkContractPages.select(function () {
    //                ejs.free("contractPages");
    //                contract.pagesLoaded = true;
    //                var page = contract.pages().orderBy("val=>val.orderNumber()").first();
    //                koModel.selected.contractPageID(page ? page.id() : "");
    //                koModel.refresh();
    //            }, [ejs.cwp("contractID", contract.id(), "=", "number")]);
    //        },
    //        error: function (err) {
    //            ejs.free("worksImport");
    //            alert("Непредвиденная ошибка!");
    //        }
    //    });
    //};

    koModel.selectFile = function (name, e) {
        var frm = $(e.target).parent().find("iframe");
        var txt = frm.contents().find("input[type=file]");
        txt.click();
    };

    initContracts(koModel, model, data);
    initDetails(koModel, model, data);
    //initDemounts(koModel, model, data);
    //initWorkContracts(koModel, model, data);

    ko.apply(koModel);
    koModel.loadNotes();
});

function initDetails(koModel, model, data) {
    var c = koModel.customer;
    var details = c.details();
    var eSet = c.typeID() == 1 ? model.physicalDetails : model.legalDetails;
    if (!details) {
        eSet.create().contractorID(koModel.customerID);
    }
};
function initContracts(koModel, model, data) {
    var sn = "Customer/Index#tblContracts";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = [];

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = [];
        }
    }

    koModel.contractsCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.contracts,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridPadding: 10,
        gridParentScroll: "div.right",
        container: $("#divContracts"),
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 20,
        pure: true,
        removeField: "deleted",
        columns:
        [{
            title: "Номер договора",
            name: "number",
            required: true
        }, {
            title: "Дата подписания",
            name: "dateSign",
            type: "date"
        }, {
            title: "Дата аванса",
            name: "dateAdvance",
            type: "date"
        }, {
            title: "Сумма аванса",
            name: "sumAdvance",
            type: "number"
        }, {
            title: "Срок сдачи",
            name: "dateEnd",
            type: "date"
        }, {
            title: "Наличие оригинала в бух.",
            name: "originalExists",
            type: "checkbox"
        }, {
            title: "Заметка",
            name: "comments",
            type: "textarea"
        }],
        filters: [{
            property: "contractorID",
            value: koModel.customer.id(),
            type: "number"
        }, {
            property: "roleID",
            value: koModel.filter.contractRoleID(),
            type: "number"
        }]
    });

    //koModel.cwcCrud.events.cancelled.attach(function (e) {
    //    model.cancelChanges();
    //});

    koModel.contractsCrud.events.creating.attach(function (e) {
        e.row.contractorID(koModel.customer.id());
        e.row.roleID(koModel.filter.contractRoleID());
    });
};

//function initWorkContracts(koModel, model, data) {
//    var sn = "Customer/Index#tblContractorWorkContracts";
//    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
//    var cols = [];

//    if (s) {
//        try {
//            cols = eval(s.value)
//        } catch (ex) {
//            cols = [];
//        }
//    }

//    koModel.contractorWorkContractsCrud = new ejs.crud({
//        koModel: koModel,
//        model: model,
//        set: model.contractorWorkContracts,
//        gridSettingsName: sn,
//        gridColumnsSettings: cols,
//        gridPadding: 10,
//        gridParentScroll: "div.right",
//        container: $("#divContractorWorkContracts"),
//        create: true,
//        edit: true,
//        remove: true,
//        autoSave: true,
//        pageSize: 20,
//        pure: true,
//        //removeField: "deleted",
//        columns:
//        [{
//            title: "Порядковый номер",
//            name: "orderNumber",
//            type: "number"
//        }, {
//            title: "Название",
//            name: "name",
//            required: true
//        }, {
//            title: "Заметка",
//            name: "comments",
//            type: "textarea"
//        }, {
//            title: "Работы",
//            name: "works",
//            showOnly: true,
//            template: "<a data-bind=\"click: $root.showWorks\" href=\"javascript:\">Открыть работы</a>"
//        }, {
//            title: "Разделы",
//            name: "pages",
//            editOnly: true,
//            editRowTemplate: "#scrContractPages"
//        }],
//        filters: [{
//            property: "contractorID",
//            value: koModel.customer.id(),
//            type: "number"
//        }]
//    });
//    koModel.cwcCrud = koModel.contractorWorkContractsCrud;
//    koModel.cwcGrid = koModel.contractorWorkContractsGrid;
//    koModel.cwc = koModel.contractorWorkContract;
//    koModel.cwcs = koModel.contractorWorkContracts;
//    koModel.cwcps = koModel.contractorWorkContractPages;

//    koModel.createCwcp = function () {
//        var page = model.contractorWorkContractPages.create().toKo();
//        page.contractID(koModel.cwc().id());
//        page.contractorID(koModel.customer.id());
//    };
//    koModel.removeCwcp = function (row) {
//        if (row.id() > 0 && !confirm(""))
//            return;
//        row.entity.remove();
//    };

//    koModel.cwcCrud.events.editing.attach(function (e) {
//        if (e.row.pagesLoaded)
//            return;
//        ejs.busy("contractPages");
//        model.contractorWorkContractPages.select(function () {
//            ejs.free("contractPages");
//            e.row.pagesLoaded = true;
//        }, [ejs.cwp("contractID", e.row.id(), "=", "number")]);
//    });

//    koModel.cwcCrud.events.cancelled.attach(function (e) {
//        model.cancelChanges();
//    });

//    koModel.cwcCrud.events.creating.attach(function (e) {
//        e.row.contractorID(koModel.customer.id());
//        //e.row.orderNumber(0);
//    });
//};

//function initWorks(koModel, model, data) {
//    var sn = "Customer/Index#tblContractorWorks";
//    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
//    var cols = [];

//    if (s) {
//        try {
//            cols = eval(s.value)
//        } catch (ex) {
//            cols = [];
//        }
//    }

//    koModel.loadWorks = function (request, callback, row) {
//        var name = row.workName().toLowerCase();
//        var filter = request ? request.term : "";
//        filter = filter ? filter.toLowerCase() : "";
//        filter = filter == name ? "" : filter;

//        var where = [ejs.cwp("deleted", false, "==", "bool")];

//        if (filter) {
//            where.push(ejs.cwp("name", "%" + filter + "%", "like"));
//        }

//        model.workTypes.select(function (collection, result) {
//            var items = result.allEntities.select(function (item) { return { label: item.name(), value: item.name(), source: item }; });
//            callback(items);
//        }, where, [ejs.cop("Name")], 20);
//    };

//    koModel.contractorWorksCrud = new ejs.crud({
//        koModel: koModel,
//        model: model,
//        set: model.contractorWorks,
//        gridSettingsName: sn,
//        gridColumnsSettings: cols,
//        gridPadding: 10,
//        gridParentScroll: "div.right",
//        container: $("#divContractorWorks"),
//        create: true,
//        edit: true,
//        remove: true,
//        autoSave: true,
//        pageSize: 50,
//        pure: true,
//        columns:
//        [{
//            title: "Раздел",
//            name: "pageID",
//            type: "select",
//            editOnly: true,
//            options: "cwcps().where(\"val=>val.contractID()==\" + $root.selected.itab().contractID)",
//            required: true
//        }, {
//            title: "Код",
//            name: "code",
//            required: true
//        }, {
//            title: "Работа",
//            name: "workTypeID",
//            orderBy: "workType.Name",
//            value: "workName",
//            type: "autocomplete",
//            method: "loadWorks",
//            required: true
//        }, {
//            title: "Ед. Измерения",
//            name: "unitName",
//            orderBy: "workType.UnitName",
//            disable: true,
//            required: true
//        }, {
//            title: "Базовая стоимость, без НДС",
//            name: "workPrice",
//            orderBy: "workType.price",
//            value: "workPrice.text",
//            disable: true
//        }, {
//            title: "Стоимость по договору, без НДС",
//            name: "price",
//            value: "price.text",
//            required: true
//        }, {
//            title: "Заметка",
//            name: "comments",
//            type: "textarea"
//        }],
//        filters: [{
//            property: "contractorID",
//            value: koModel.customer.id(),
//            type: "number"
//        }, {
//            property: "contractID",
//            value: ko.cmp(function () {
//                return koModel.selected.itab().contractID || -1;
//            }),
//            type: "number"
//        }, {
//            property: "pageID",
//            value: ko.cmp(function () {
//                return koModel.selected.contractPageID() || -1;
//            }),
//            type: "number"
//        }]
//    });
//    koModel.cwCrud = koModel.contractorWorksCrud;
//    koModel.cwGrid = koModel.contractorWorksGrid;
//    koModel.cwPager = koModel.contractorWorksPager;
//    koModel.createCw = koModel.createContractorWork;

//    koModel.cwCrud.events.creating.attach(function (e) {
//        var contractID = koModel.selected.itab().contractID;

//        var page = koModel.selected.contractPageID();
//        e.row.contractorID(koModel.customer.id());
//        e.row.contractID(contractID);
//        e.row.pageID(page);
//    });

//    koModel.cwPager.events.pageChanging.attach(function (e) {
//        ejs.busy("cwPager");
//    });

//    koModel.cwPager.events.pageChanged.attach(function (e) {
//        ejs.free("cwPager");
//    });
//};
//function initDemounts(koModel, model, data) {
//    var sn = "Customer/Index#tblContractorDemounts";
//    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
//    var cols = [];

//    if (s) {
//        try {
//            cols = eval(s.value)
//        } catch (ex) {
//            cols = [];
//        }
//    }

//    koModel.loadDemounts = function (request, callback, row) {
//        var name = row.demountName().toLowerCase();
//        var filter = request ? request.term : "";
//        filter = filter ? filter.toLowerCase() : "";
//        filter = filter == name ? "" : filter;

//        var where = [ejs.cwp("deleted", false, "==", "bool")];

//        if (filter) {
//            where.push(ejs.cwp("name", "%" + filter + "%", "like"));
//        }

//        model.demountTypes.select(function (collection, result) {
//            var items = result.allEntities.select(function (item) { return { label: item.name(), value: item.name(), source: item }; });
//            callback(items);
//        }, where, [ejs.cop("Name")], 20);
//    };

//    koModel.contractorDemountsCrud = new ejs.crud({
//        koModel: koModel,
//        model: model,
//        set: model.contractorDemounts,
//        gridSettingsName: sn,
//        gridColumnsSettings: cols,
//        gridPadding: 10,
//        gridParentScroll: "div.right",
//        container: $("#divContractorDemounts"),
//        create: true,
//        edit: true,
//        remove: true,
//        autoSave: true,
//        pageSize: 50,
//        pure: true,
//        columns:
//        [{
//            title: "Раздел",
//            name: "pageID",
//            type: "select",
//            editOnly: true,
//            options: "cwcps().where(\"val=>val.contractID()==\" + $root.selected.itab().contractID)",
//            required: true
//        }, {
//            title: "Код",
//            name: "code",
//            required: true
//        }, {
//            title: "Демонтаж",
//            name: "demountTypeID",
//            orderBy: "demountType.Name",
//            value: "demountName",
//            type: "autocomplete",
//            method: "loadDemounts",
//            required: true
//        }, {
//            title: "Коэффициент, %",
//            name: "rate",
//            value: "rate.text",
//            required: true
//        }, {
//            title: "Заметка",
//            name: "comments",
//            type: "textarea"
//        }],
//        filters: [{
//            property: "contractorID",
//            value: koModel.customer.id(),
//            type: "number"
//        }, {
//            property: "contractID",
//            value: ko.cmp(function () {
//                return koModel.selected.itab().contractID || -1;
//            }),
//            type: "number"
//        }, {
//            property: "pageID",
//            value: ko.cmp(function () {
//                return koModel.selected.contractPageID() || -1;
//            }),
//            type: "number"
//        }]
//    });
//    koModel.cdCrud = koModel.contractorDemountsCrud;
//    koModel.cdGrid = koModel.contractorDemountsGrid;
//    koModel.cdPager = koModel.contractorDemountsPager;
//    koModel.createCd = koModel.createContractorDemount;

//    koModel.cdCrud.events.creating.attach(function (e) {
//        var contractID = koModel.selected.itab().contractID;

//        var page = koModel.selected.contractPageID();
//        e.row.contractorID(koModel.customer.id());
//        e.row.contractID(contractID);
//        e.row.pageID(page);
//    });

//    koModel.cdPager.events.pageChanging.attach(function (e) {
//        ejs.busy("cdPager");
//    });

//    koModel.cdPager.events.pageChanged.attach(function (e) {
//        ejs.free("cdPager");
//    });
//};