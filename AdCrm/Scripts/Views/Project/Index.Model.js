var koModel = {
    selected: {
        itabID: ko.obs(1),
        work: ko.obs(null)
    },
    projectWork: {
        selectedArray: ko.obsa([]),
        totals: { totals: true },
        current: ko.obs(null)
    },
    projectFile: ko.obs(null),
    itabs: ko.obsa([{
        id: 1,
        frmID: "frmProject",
        name: "информация"
    }, {
        id: 3,
        frmID: "frmTasks",
        name: "задачи",
        url: host.arp + "Project/Tasks/{0}"
    }, {
        id: 2,
        frmID: "frmExpenses",
        name: "расходы"
    }, {
        id: 4,
        frmID: "frmBills",
        name: "счета"
    }, {
        id: 5,
        frmID: "frmSalary",
        name: "начисления",
        url: host.arp + "Project/Payrolls/{0}"
    }, {
        id: 6,
        frmID: "frmFinances",
        name: "финансы"
    }, {
        id: 9,
        frmID: "frmFiles",
        name: "файлы",
        url: host.arp + "Project/Files/{0}"
    }]),
    gridProjectWorks: null,//$.fn.koGrid.getSaveSettingsObject("/Project/Index#tblProjectWorks", "tblProjectWorks"),
    dialog: { payments: { result: ko.obs("") }, documents: { result: ko.obs("") } },
    hideThePage: ko.obs(false)
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

    koModel.stageCategories = function (id) {
        var refbooks = koModel.refbooks().where("val=>val.typeID()==1");
        refbooks = refbooks.where("val=>!val.deleted()||val.id()=='" + id + "'").orderBy("val=>val.orderNumber()");
        return refbooks;
    };
    koModel.categoryStages = function (categoryID) {
        var category = categoryID ? koModel.refbooks().first("val=>val.id()=='" + categoryID + "'") : null;
        if (category) {
            return category.stages().where("val=>!val.deleted()||val.checked()").orderBy("val=>val.orderNumber");
        }
        return koModel.workStages().where("val=>!val.categoryID()&&(!val.deleted()||val.checked())").orderBy("val=>val.orderNumber");
    };

    koModel.projectID = data.projects[0].id;
    model.projects.refreshData(data.projects);
    model.toKo(koModel);
    koModel.project = koModel.projects().first();
    koModel.children = ko.obsa(data.children);
    koModel.inserted = ko.obs(null);
    koModel.insertedNote = ko.obs(null);
    model.addData(data);

    koModel.itabs().select("val=>val").forEach(function (row) {
        if (row.url) {
            row.url = row.url.replace("{0}", koModel.projectID);
        }
        var frms = [2, 4, 5, 6];
        if (koModel.project.parentID() && frms.contains(row.id))
            koModel.itabs.remove(row);
    });
    //set childrens statuses
    for (var i = 0; i < koModel.children().length; i++) {
        var id = koModel.children()[i].statusID;
        if (id == '') {
            koModel.children()[i].status = ko.obs();
        } else {
            var status = koModel.projectStatuses().first("val=>val.id()=='" + id + "'");
            koModel.children()[i].status = ko.obs(status);
        }
    }

    koModel.getModel = function () { return model; };

    koModel.createProjectNote = function () {
        var note = model.projectNotes.create();
        note.date((new Date()).toSds());
        note.projectID(koModel.project.id());
    };

    koModel.removeProjectNote = function (note) {
        ejs.confirm("Удаление", "Вы точно хотите удалить эту новость?", function () {
            note.entity.remove();
        });
    };

    koModel.editProjectNote = function (note, e) {
        setTimeout(function () { $(e.target).hide().parent().find('textarea').show().focus(); }, 50);
    };

    koModel.removeProject = function (row) {
        ejs.confirm("Удаление", "Вы точно хотите подпроект " + row.name + "?", function () {
            koModel.children.remove(row);
            row = model.projects.addData([row]).allEntities.first();
            row.remove();
        });
    };

    koModel.createProject = function () {
        if (!koModel.inserted() || koModel.inserted().id() > 0) {
            var project = model.projects.create().toKo();
            koModel.inserted(project);
            project.name(koModel.project.name());
            project.typeID(koModel.project.typeID());
        }
        $("#divProject").dialog("open");
    };

    koModel.cancelProject = function () {
        koModel.inserted(null);
        $("#divProject").dialog("close");
    };

    koModel.updateProject = function () {
        if (!$("#frmProject").valid()) {
            return;
        }
        var project = koModel.inserted();
        project.parentID(koModel.project.id());
        project.dateSign((new Date()).toSds());
        project.number(koModel.project.number());
        project.typeID(project.typeID() || koModel.project.typeID());
        project.employeeID(koModel.project.employeeID());
        koModel.updateAll(function () { koModel.children.push(project); });
        //model.update(function () { window.location = host.arp + 'Project/Index/' + project.id(); })
        $("#divProject").dialog("close");
    };

    koModel.selectTab = function (row) {
        var oldTab = koModel.itabs().first("val=>val.id=='" + koModel.selected.itabID() + "'");
        var valid = true;

        if (oldTab) {
            $("form").each(function (it) { valid = valid & $(this).valid(); });
        }

        var fn = function () {
            koModel.selected.itabID(row.id);

            if (row.id == 2) {
                koModel.expensesKoModel.refresh();
            } else if (row.id == 3) {
                koModel.loadAllActs();
            } else if (row.id == 4 || row.id == 5) {
                koModel.loadAllPayments();
            }
        };

        valid = valid && koModel.updateAll(fn, "");
        return valid;
    };

    koModel.loadAllPayments = function () {
        if (koModel.project.paymentsLoaded()) {
            return;
        }
        model.invoices.getChildren(koModel.project.id(), "projectID", function () {
            //koModel.project.invoicesLoaded(true);
            top.free("InvoicesLoading");
        });
        top.busy("PaymentsLoading");
        model.payments.getChildren(koModel.project.id(), "projectID", function () {
            koModel.project.paymentsLoaded(true);
            top.free("PaymentsLoading");
        });
    };
    koModel.loadAllActs = function () {
        if (koModel.project.actsLoaded()) {
            return;
        }
        top.busy("ActsLoading");
        model.acts.getChildren(koModel.project.id(), "contract.ProjectID", function () {
            koModel.project.actsLoaded(true)
            top.free("ActsLoading");
        });
    };

    koModel.projectWork.all = ko.cmp({
        read: function () {
            var count = koModel.project.works().length;
            return count > 0 && count == koModel.projectWork.selectedArray().length;
        }, write: function (value) {
            if (value) {
                koModel.projectWork.selectedArray.removeAll();
                koModel.project.works().forEach(function (it) {
                    koModel.projectWork.selectedArray.push(it.id().toString());
                });
            } else {
                koModel.projectWork.selectedArray.removeAll();
            }
        }
    });

    koModel.projectWork.selected = ko.cmp(function () { return koModel.project.works().where(function (it) { return koModel.projectWork.selectedArray().contains(it.id().toString()); }); });
    koModel.projectWork.totals.count = ko.cmp(function () { return koModel.project.works().sum("val=>val.count()*1"); });
    koModel.projectWork.totals.cost = ko.cmp(function () { return koModel.project.works().sum("val=>val.cost()*1"); });
    //koModel.projectWork.totals.costCustomerNoVat = ko.cmp(function () { return koModel.project.works().sum("val=>val.costCustomerNoVat()*1"); });
    koModel.projectWork.totals.costContractor = ko.cmp(function () { return koModel.project.works().sum("val=>val.contractorExists()?val.costContractor()*1:0"); });
    //koModel.projectWork.totals.kickbackSum = ko.cmp(function () { return koModel.project.works().sum("val=>val.kickbackSum()*1"); });
    //koModel.projectWork.totals.paidSum = ko.cmp(function () { return koModel.project.works().sum("val=>val.payedSum()*1"); });
    koModel.projectWork.totals.selected = ko.cmp(function () {
        var rows = koModel.projectWork.selected();
        if (!rows.any()) {
            return null;
        }
        return {
            count: rows.sum("val=>val.count()*1"), cost: rows.sum("val=>val.cost()*1"),// costCustomerNoVat: rows.sum("val=>val.costCustomerNoVat()*1"),
            costContractor: rows.sum("val=>val.contractorExists()?val.costContractor()*1:0")//, kickbackSum: rows.sum("val=>val.kickbackSum()*1")//, paidSum: rows.sum("val=>val.payedSum()*1")
        };
    });

    koModel.projectWork.edit = function (row) {
        if (row.typeID() > 0) {
            if (!row.type()) {
                ejs.busy("workTypes");
                model.workTypes.getByID(row.typeID(), function () {
                    ejs.free("workTypes");
                });
            }
            //var pID = koModel.project.contractorContractPageID();
            //if (pID > 0 && !koModel.contractorWorks().any("val=>val.workTypeID()==" + row.typeID() + "&&val.pageID()==" + pID)) {
            //    ejs.busy("contractorWorks");
            //    model.contractorWorks.getChildren(row.typeID(), "workTypeID", function () {
            //        ejs.free("contractorWorks");
            //    }, [ejs.cwp("pageID", koModel.project.contractorContractPageID(), "=", "number")]);
            //}
        }
        koModel.projectWork.current(row);
    };

    koModel.projectWork.apply = function (row) {
        koModel.projectWork.current(null);
    };

    koModel.showReport = function () {
        koModel.updateAll(function () {
            koModel.loadAllPayments();
            koModel.loadAllActs();
            reportDialogKoModel.show();
        }, '');
    };

    koModel.showGain = function () {
        gainDialogKoModel.projectID(koModel.projectID);
        koModel.updateAll(function () {
            gainDialogKoModel.show();
        }, '');
    };

    koModel.recalcDaysEnd = function (row) {
        if (!row.recalcEnd || isEmpty(row.daysEnd() + "")) {
            return;
        }
        var daysFrom = row.daysFromTypeID();
        var daysType = row.daysTypeID();
        var contract = row.contract();
        var dateSign = row.dateSign ? row.dateSign() ? row.dateSign() : row.createDate() : contract && contract.dateSign() ? contract.dateSign() : row.createDate();
        daysFrom = daysFrom ? daysFrom : 1;
        daysType = daysType ? daysType : 1;
        var dateFrom = daysFrom == 1 ? dateSign : row.advanceDate();
        var dateTo = row.dateEnd();
        if (!dateFrom || !dateTo) {
            return;
        }
        dateFrom = parseDate(dateFrom);
        row.recalcEnd = false;

        if (daysType == 1) {
            var diff = dateFrom.dateDiff(dateTo);
            row.daysEnd(diff.days);
        } else {
            var days = 0;
            var diff = dateFrom.dateDiff(dateTo);
            for (var i = 0; i < diff.days; i++) {
                dateFrom.setDate(dateFrom.getDate() + 1);
                if (dateFrom.getDay() != 0 && dateFrom.getDate() != 6) {
                    days++;
                }
            }
            row.daysEnd(days);
        }

        row.daysFromTypeID(daysFrom);
        row.daysTypeID(daysType);

        row.recalcEnd = true;
    };

    koModel.recalcDateEnd = function (row) {
        if (!row.recalcEnd) {
            return;
        }
        var daysFrom = row.daysFromTypeID();
        var daysType = row.daysTypeID();
        var contract = row.contract();
        var dateSign = row.dateSign ? row.dateSign() ? row.dateSign() : row.createDate() : contract && contract.dateSign() ? contract.dateSign() : row.createDate();
        daysFrom = daysFrom ? daysFrom : 1;
        daysType = daysType ? daysType : 1;
        var dateFrom = daysFrom == 1 ? dateSign : row.advanceDate();
        var days = row.daysEnd();
        if (!dateFrom || !days || days <= 0) {
            return;
        }
        dateFrom = parseDate(dateFrom);
        row.recalcEnd = false;

        if (daysType == 1) {
            dateFrom.setDate(dateFrom.getDate() + days * 1);
            row.dateEnd(dateFrom.toSds());
        } else {
            for (var i = 0; i < days;) {
                dateFrom.setDate(dateFrom.getDate() + 1);
                if (dateFrom.getDay() == 0 || dateFrom.getDate() == 6) {
                    continue;
                }
                i++;
            }
            row.dateEnd(dateFrom.toSds());
        }

        row.daysFromTypeID(daysFrom);
        row.daysTypeID(daysType);

        row.recalcEnd = true;
    };

    koModel.removeMainContract = function () {
        if (koModel.project.contract().id() < 0 || confirm("Вы действительно хотите удалить заказ по текущему проекту?")) {
            koModel.project.contract().entity.remove();
            koModel.project.contractID("");
        }
    };

    koModel.createMainContract = function () {
        var contract = model.contracts.create();
        contract.contractorID(koModel.project.contractorID());
        contract.roleID(1);
        contract.dateSign((new Date()).toSds());
        contract.projectID(koModel.project.id());
        koModel.project.contractID(contract.id());
    };

    koModel.activeWorkTypes = function (parent, work) {
        var typeID = work.typeID();
        var child = parent.childTypes();
        child = child.where(function (it) { return (!it.deleted() && !parent.deleted()) || it.id() == typeID; }).orderBy("val=>val.orderNumber()");
        return child;
    };

    koModel.activeManagers = function (row) {
        var users = koModel.users();
        users = users.where(function (it) {
            return (!it.deleted() && !it.blocked() && it.roleID() > 1 && it.roleID() < 4) || it.id() == row.responsibleID();
        }).orderBy("val=>val.fullName()");
        return users;
    };

    koModel.createWork = function () {
        var work = model.projectWorks.create();
        work.projectID(koModel.project.id());
        work.orderNumber(koModel.projectWorks().length);
        koModel.projectWork.current(work.toKo());
    };

    koModel.removeWork = function (row) {
        var message = ["Вы действительно хотите удалить работу", row.name(),
            row.payments().any() ? " и все платежи по ней" : "", "?"].join("");

        if ((row.id() < 0 && !row.payments().any()) || confirm(message)) {
            row.payments().forEach(function (val) { val.entity.remove(); });
            row.entity.remove();
            koModel.projectWork.selectedArray([]);
        }
    };

    koModel.editMainContractor = function (contractor) {
        var id = contractor.id();
        var roleID = contractor.roleID();
        var onClosed = contractorsDialogKoModel.show(roleID == 1 ? "Информация по клиенту" : "Информация по подрядчику", id);
        onClosed(function (result) {
            if (result) {
                koModel.contactPersons().where("val=>val.contractorID()==" + id).forEach(function (it) { it.contacts().forEach(function (val) { val.entity.detach(); }); it.entity.detach(); });
                model.select({ EntitySetName: "Contractors", Wheres: [ejs.cwp("id", id, "=", "number")], Includes: [ejs.createIncludeParameter(model.contactPersons, true, ejs.createIncludeParameter(model.contacts, true))] },
                function (result) {
                    model.addData(result.collections);
                    if (roleID == 1) {
                        koModel.project.contractorTypeID(contractor.typeID());
                        koModel.loadContracts();
                    } else {
                        koModel.project.subcontractorTypeID(contractor.typeID());
                    }
                });
            }
        });
    };

    koModel.chooseMainContractor = function (roleID) {
        roleID = roleID > 0 ? roleID : 1;
        var p = koModel.project;
        contractorsDialogKoModel.filter.type(roleID == 1 ? p.contractorTypeID() : p.subcontractorTypeID());
        contractorsDialogKoModel.filter.role(roleID);
        var onClosed = contractorsDialogKoModel.show("Выбрать/создать " + (roleID == 1 ? "клиента" : "подрядчика"));
        //contractorsDialogKoModel.contractor().roleID(roleID);
        onClosed(function (result, selected) {
            if (result) {
                var id = selected.id();
                koModel.contactPersons().where("val=>val.contractorID()==" + id).forEach(function (it) { it.contacts().forEach(function (val) { val.entity.detach(); }); it.entity.detach(); });
                model.select({ EntitySetName: "Contractors", Wheres: [ejs.cwp("id", id, "=", "number")], Includes: [ejs.createIncludeParameter(model.contactPersons, true, ejs.createIncludeParameter(model.contacts, true))] },
                function (result) {
                    model.addData(result.collections);
                    if (roleID == 1) {
                        p.contractorID(id);
                        p.contractorTypeID(p.contractor().typeID());
                    } else {
                        p.subcontractorID(id);
                        p.subcontractorTypeID(p.subcontractor().typeID());
                    }
                });
            }
        });
    };

    koModel.editSubContractor = function (work) {
        var id = work.contractor().id();
        var onClosed = contractorsDialogKoModel.show("Информация по субподрядчику", id);
        onClosed(function (result) {
            if (result) {
                koModel.contactPersons().where("val=>val.contractorID()==" + id).forEach(function (it) { it.contacts().forEach(function (val) { val.entity.detach(); }); it.entity.detach(); });
                model.select({ EntitySetName: "Contractors", Wheres: [ejs.cwp("id", id, "=", "number")], Includes: [ejs.createIncludeParameter(model.contactPersons, true, ejs.createIncludeParameter(model.contacts, true))] },
                function (result) {
                    model.addData(result.collections);
                });
            }
        });
    };

    koModel.chooseSubContractor = function (row) {
        contractorsDialogKoModel.filter.role(2);
        if (row.entity.settings.name == "payment") {
            contractorsDialogKoModel.filter.projectID(koModel.projectID);
        } else {
            contractorsDialogKoModel.filter.projectID("");
        }
        var onClosed = contractorsDialogKoModel.show("Выбрать/создать субподрядчика");
        //contractorsDialogKoModel.contractor().roleID(2);
        onClosed(function (result, selected) {
            if (result) {
                var id = selected.id();
                koModel.contactPersons().where("val=>val.contractorID()==" + id).forEach(function (it) { it.contacts().forEach(function (val) { val.entity.detach(); }); it.entity.detach(); });
                model.select({ EntitySetName: "Contractors", Wheres: [ejs.cwp("id", id, "=", "number")], Includes: [ejs.createIncludeParameter(model.contactPersons, true, ejs.createIncludeParameter(model.contacts, true))] },
                function (result) {
                    model.addData(result.collections);
                    row.contractorID(id);
                });
            }
        });
    };

    koModel.chooseWork = function (row) {
        var onClosed = workTypesDialogKoModel.show("", koModel.project.contractorID());//, koModel.project.contractorContractID(), koModel.project.contractorContractPageID());

        onClosed(function (result, selected) {
            if (result && selected.any()) {
                if (selected.length == 1 && row && row.entity) {
                    var work = selected.first();
                    row.typeID(work.id());
                    //row.price(work.contractorPrice());
                    //row.code(work.contractorCode());
                } else {
                    for (var i = 0; i < selected.length; i++) {
                        var workType = selected[i];
                        var work = model.projectWorks.create();
                        work.projectID(koModel.project.id());
                        work.typeID(workType.id());
                        //work.price(workType.contractorPrice());
                        work.code(workType.code());
                        work.orderNumber(koModel.projectWorks().length);
                    }
                }
            }
        });
    };

    koModel.editWorkPayments = function (work) {
        koModel.selected.work(work);
        if (!work.paymentsLoaded() && !koModel.project.paymentsLoaded()) {
            model.payments.getChildren(work.id(), "workID", function () {
                work.paymentsLoaded(true)
                work.payments().forEach(function (it) { it.entity.backup(); });
                $("#divPaymentsDialog").dialog({ title: koModel.project.name() + " - " + (work.contractor() ? work.contractor().name() + " - " : "") + " Субподрядчик" });
                $("#divPaymentsDialog").dialog("open");
            });
        } else {
            work.payments().forEach(function (it) { it.entity.backup(); });
            $("#divPaymentsDialog").dialog({ title: koModel.project.name() + " - " + (work.contractor() ? work.contractor().name() + " - " : "") + " Субподрядчик" });
            $("#divPaymentsDialog").dialog("open");
        }
    };

    //koModel.createPayment = function (context) {
    //    var payment = model.payments.create();
    //    payment.date((new Date()).toSds());
    //    //payment.typeID(1);
    //    if (context === 2 || context.entity.settings.name == "projectWork") {
    //        payment.roleID(2);
    //        payment.projectID(context.projectID ? context.projectID() : koModel.projectID);
    //        payment.workID(context.id ? context.id() : "");
    //    } else if (context.entity.settings.name == "project") {
    //        payment.roleID(1);
    //        payment.projectID(context.id());
    //    } else if (context.entity.settings.name == "invoice") {
    //        payment.roleID(1);
    //        payment.projectID(context.projectID());
    //        payment.invoiceID(context.id());
    //        payment.number(context.number());
    //        payment.sum(context.leftAmount());
    //    }
    //};

    koModel.removePayment = function (row) {
        if (row.id() < 0 || confirm("Вы действительно хотите удалить платеж " + row.number() + " (" + row.date() + ")?")) {
            row.entity.remove();
        }
    };

    koModel.createInvoice = function (context) {
        var invoice = model.invoices.create();
        invoice.date((new Date()).toSds());
        invoice.drawnDate((new Date()).toSds());
        invoice.drawnDate((new Date()).toSds());
        invoice.projectID(koModel.projectID);
    };

    koModel.removeInvoice = function (row) {
        if (row.id() < 0 || confirm("Вы действительно хотите удалить счет " + row.number() + " (" + row.date() + ") и все его платежи?")) {
            row.payments().forEach(function (it) {
                it.entity.detach();
            });
            row.entity.remove();
        }
    };



    koModel.invoiceChange = function (event, ui, row) {
        if (!ui.item) {
            row.invoiceID("");
            return false;
        }
    };

    koModel.dialog.payments.closed = function () {
        var result = koModel.dialog.payments.result();
        var work = koModel.selected.work();
        if (result) {
            work.payments().forEach(function (it) { it.entity.commit(); });
            koModel.updateAll();
            //work.payedSum(work.payments().sum("val=>val.sum()"));
        } else {
            work.payments().forEach(function (it) { it.entity.restore(); if (it.id() < 0) { it.entity.remove(); } });
            //work.payedSum(work.payments().sum("val=>val.sum()"));
            var removed = model.payments.getRemoved();
            removed.where("val=>val.id() > 0 && val.workID()==" + work.id()).forEach(function (it) { it.renew(); it.restore(); });
            removed.clear();
        }
    };

    koModel.editWorkDocuments = function (work) {
        koModel.selected.work(work);
        work.entity.backup();
        if (!work.contract()) {
            var contractor = work.contractor();
            //var oldContract = contractor.contracts().first("val=>val.roleID()==2&&val.projectID()==" + work.projectID());
            //if (oldContract) {
            //    work.contractID(oldContract.id());
            //} else {
            var contract = model.contracts.create();
            contract.roleID(2);
            contract.projectID(work.projectID());
            contract.contractorID(work.contractorID());
            contract.dateSign((new Date()).toSds());
            work.contractID(contract.id());
            work.contract().entity.backup();
            $("#divContractDialog").dialog({ title: koModel.project.name() + " - " + (work.contractor() ? work.contractor().name() + " - " : "") + " Субподрядчик" });
            $("#divContractDialog").dialog("open");
            return;
            //}
        }

        model.acts.getChildren(work.contractID(), "contractID", function () {
            work.contract().entity.backup();
            work.contract().acts().forEach(function (it) { it.entity.backup(); });
            $("#divContractDialog").dialog({ title: koModel.project.name() + " - " + (work.contractor() ? work.contractor().name() + " - " : "") + " Субподрядчик" });
            $("#divContractDialog").dialog("open");
        });
    };

    koModel.createAct = function (contract) {
        var act = model.acts.create();
        act.contractID(contract.id());
        act.createDate((new Date()).toSds());
    };

    koModel.removeAct = function (row) {
        if (row.id() < 0 || confirm("Вы действительно хотите удалить акт " + row.number() + "?")) {
            row.entity.remove();
        }
    };

    koModel.createExpense = function () {
        koModel.expensesKoModel.expense.create();
    };

    koModel.dialog.documents.closed = function () {
        var result = koModel.dialog.documents.result();
        var work = koModel.selected.work();
        if (result) {
            work.entity.commit();
            work.contract().acts().forEach(function (it) { it.entity.commit(); });
            work.contract().entity.commit();
            koModel.updateAll();
        } else {
            work.contract().acts().forEach(function (it) { it.entity.restore(); if (it.id() < 0) { it.entity.remove(); } });
            if (work.contract().id() < 0) {
                work.contract().entity.remove();
                work.contractID("");
            } else {
                work.contract().entity.restore();
                var removed = model.acts.getRemoved();
                removed.where("val=>val.id() > 0 && val.contractID()=='" + work.contractID() + "'").forEach(function (it) { it.renew(); it.restore(); });
                removed.clear();
            }
            work.entity.restore();
        }
    };

    koModel.loadContracts = function () {
        var contractor = koModel.project.contractor();
        if (!contractor)
            return;
        model.contracts.getChildren(contractor.id(), "contractorID", function () {
        }, [ejs.cwp("roleID", 3, "==", "number")]);
    };

    koModel.updateAll = function (callback, showQtip) {
        var valid = true;
        $("div.container form").each(function (it) { valid = valid & $(this).valid(); });

        if (valid && typeof koModel.valid == "function") {
            valid = koModel.valid();
        }

        if (!valid) {
            koModel.qtip("Проверьте правильность данных!");
            return false;
        }

        top.busy("UpdateProject");

        var oldContracts = koModel.contracts().where(function (it) {
            return it.roleID() == 2 && !koModel.project.works().any("val=>val.contractID()==" + it.id());
        });
        oldContracts.forEach(function (it) { it.entity.remove(); });

        model.update(function (result) {
            top.free("UpdateProject");
            var changes = result.changes.updated.any() || result.changes.deleted.any();
            if (showQtip == false || result.canceled.any()) {
            } else if (showQtip == true || changes) {
                koModel.qtip();
            }

            if (typeof callback == "function") {
                callback(result);
            }

            if (changes) {
                model.projects.getByID(koModel.projectID, function () { });
            }
        });
        return true;
    };

    koModel.valid = function () {
        var first = koModel.expenses().first("val=>!val.walletID()");
        if (first) {
            ejs.alert("Необходимо заполнить кошелек для всех расходов!");
            koModel.expensesKoModel.expense.current(first);
            return false;
        }
        return true;
    };

    koModel.generateDocument = function (typeID) {
        if (koModel.hasChanges()) {
            koModel.updateAll(function () {
                koModel.generateDocument(typeID);
            });
            return;
        }
        var data = {
            id: koModel.project.id(),
            typeID: typeID,
            workIDs: koModel.projectWork.selectedArray()
        };

        data = toServerObject(data);
        top.busy("generateDocument");
        $.rjson({
            data: data,
            url: host.arp + "Project/Document",
            success: function (result) {
                top.free("generateDocument");
                top.window.location = result.ProjectFile.Url;
                var file = toJsObject(result.ProjectFile);
                if (file && !koModel.projectFiles().any("val=>val.id()=='" + file.id + "'")) {
                    model.projectFiles.addData([file]);
                }
            },
            error: function () { top.free("generateDocument"); alert("Ошибка сервера"); }
        });
    };

    koModel.addAttachment = function () {
        var pf = model.projectFiles.create().toKo();
        var f = model.files.create().toKo();
        pf.fileID(f.id());
        koModel.projectFile(pf);
        $("#divAttachmentDialog").dialog("open");
    };
    koModel.removeAttachment = function (row) {
        if (confirm("Вы действительно хотите удалить приложение " + row.fileName() + "?")) {
            if (row.file()) {
                row.file().entity.remove();
            }
            row.entity.remove();
            koModel.updateAll();
        }
    };

    koModel.toExcel = function () {
        var project = koModel.project;
        var contract = project.contract();
        var contractor = project.contractor();
        var stages = project.stages().select("val=>val.stage().name()");
        var works = project.works().orderBy("val=>val.orderNumber()");

        var count = 0;

        var mc = contractor ? contractor.mainContactPerson() : null;
        mc = mc && mc.entity ? mc : null;
        var contacts = [];
        var headers = [];
        var meta = [{ Name: "sheet", ID: 1, Settings: ["FontFamily", "Arial"] }, { Name: "row", ID: 1, Settings: ["FontWeight", "bold"] }, { Name: "row", ID: 3, Settings: ["FontWeight", "bold"] }];
        var name = [project.name(), "_", (new Date()).toSds()].join("");
        var rows = [];

        if (mc) {
            contacts.push(mc.fullName() + (mc.position() ? ", " + mc.position() : ""));
            mc.contacts().forEach(function (it) {
                contacts.push(it.type().name() + ': ' + it.text());
            });
        }

        works = works.select(function (it) {
            var wc = it.contractor();
            var wcmc = wc ? wc.mainContactPerson() : null;
            wcmc = wcmc && wcmc.entity ? wcmc : null;

            var wcs = [];

            if (wcmc) {
                wcs.push(wcmc.fullName() + (wcmc.position() ? ", " + wcmc.position() : ""));
                wcmc.contacts().forEach(function (it) {
                    wcs.push(it.type().name() + ': ' + it.text());
                });
            }

            return { name: it.name(), contractor: wc ? wc.name() : "", contacts: wcs.join(", ") };
        });

        count = [contacts.length, stages.length, works.length].max("val=>val");

        rows.push([project.name()]);
        rows.push([""]);

        rows.push(["№ Заказа", "Дата заказа", "Клиент", "Контакты клиента", "Проект", "Адрес", "Стадия", "Работы", "Субподрядчики", "Контакты субподрядчиков"]);
        rows.push([contract ? contract.number() : "", project.dateSign(), contractor ? contractor.name() : "", contacts[0] ? contacts[0] : "",
            project.name(), project.address(), stages[0] ? stages[0] : "", works[0] ? works[0].name : "", works[0] ? works[0].contractor : "", works[0] ? works[0].contacts : ""]);

        for (var i = 1; i < count; i++) {
            rows.push(["", "", "", contacts[i] ? contacts[i] : "", "", "", stages[i] ? stages[i] : "", works[i] ? works[i].name : "", works[i] ? works[i].contractor : "", works[i] ? works[i].contacts : ""]);
        }

        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows, Meta: meta }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    koModel.loadWorksByCode = function (request, callback, row) {
        return koModel.loadWorks(request, callback, row, true);
    };
    koModel.loadWorks = function (request, callback, row, code) {
        //var cc = koModel.project.contractorContractID();
        //var ccp = koModel.project.contractorContractPageID();
        var name = row.name().toLowerCase();
        var cid = koModel.project.contractorID();
        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp(/*(ccp ? "WorkType." : "") + */"Deleted", false, "==", "bool")];
        if (filter) {
            var w = ejs.cwp("group", "%" + filter + "%", "like", "group");
            w.SubParameters = code ? [ejs.cwp("code", "%" + filter + "%", "like", "string")] : [ejs.cwp("shortName", "%" + filter + "%", "like", "string"), ejs.cwp("shortName", true, "isNull", "", "or"), ejs.cwp("name", "%" + filter + "%", "like", "string", "and")];
            //if (ccp && !code) {
            //    w.SubParameters.forEach(function (it) {
            //        it.Property = "WorkType." + it.Property;
            //    });
            //}
            where.push(w);
        }
        //if (ccp) {
        //    where.push(ejs.cwp("ContractorID", cid, "=", "number"), ejs.cwp("ContractID", cc, "=", "number"), ejs.cwp("PageID", ccp, "=", "number"));
        //}

        var orders;
        if (code) {
            orders = /*ccp ? [ejs.cop("Code"), ejs.cop("WorkType.Code")] : */[ejs.cop("Code")];
        } else {
            orders = /*ccp ? [ejs.cop("WorkType.ShortName"), ejs.cop("WorkType.Name")] : */[ejs.cop("ShortName"), ejs.cop("Name")];
        }
        var so = ejs.cso(/*ccp ? model.contractorWorks : */model.workTypes, where, orders, 20, ""/*, ccp ? [ejs.cip(model.workTypes)] : ""*/);

        model.select(so, function (result) {
            model.addData(result.collections);

            var items;
            //if (ccp) {
            //    items = result.collections.contractorWorks.select(function (item) {
            //        var text = code ? item.code || item.workCode : (item.workShortName || item.workName);
            //        return { label: text, value: text, source: { id: item.workTypeID } };
            //    });
            //} else {
            items = result.collections.workTypes.select(function (item) {
                var text = code ? item.code : (item.shortName || item.name);
                return { label: text, value: text, source: item };
            });
            //}
            callback(items);
        });
    };

    koModel.loadInvoices = function (request, callback, row) {
        var name = row.number().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("nulled", false, "=", "bool"), ejs.cwp("projectID", koModel.project.id(), "=", "number")];
        if (filter) {
            var w = ejs.cwp("number", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.invoices, where, [ejs.cop("number")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.invoices.select(function (it, i) {
                return { label: it.number, value: it.number, source: it };
            }));
        });
    }

    koModel.loadInvoiceWallets = function (request, callback, row) {
        return koModel.loadWallets(request, callback, row, host.walletTypes.invoice);
    };
    koModel.loadWallets = function (request, callback, row, type) {
        var name = row.walletName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool")];
        if (type) {
            where.push(ejs.cwp("typeID", type, "=", "number"));
        }
        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.wallets, where, [ejs.cop("name")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.wallets.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };
    koModel.loadEmployees = function (request, callback, row, type) {
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

    koModel.workTypeChange = function (event, ui, row) {
        if (!ui.item) {
            //var customer = koModel.contractors().first("val=>val.roleID()==1&&val.name()=='" + row.customerName() + "'&&!val.deleted()");
            row.typeID("");
            return false;
        }
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

    initProjectInvoices(koModel, model, data);
    initProjectPayments(koModel, model, data);
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
            belongs: ["contractor", { name: "subcontractor", setName: "contractors" }, "contract", { name: "responsible", setName: "users", fkProperty: "responsibleID" }, { name: "status", setName: "projectStatuses" }],
            hasMany: ["invoices", "projectFiles", "contracts", { name: "stages", setName: "projectStages" }, { name: "works", setName: "projectWorks" }, { name: "allPayments", setName: "payments" }]
        }, {
            name: "projectFileCategories",
            properties: ["name", "sysName"],
            hasMany: [{ name: "projectFiles", fkProperty: "typeID" }]
        }, {
            name: "projectFiles",
            properties: ["fileName", "url", "categoryID", "fileID", "projectID", "size"],
            belongs: [{ name: "category", setName: "projectFileCategories" }, "file"]
        }, {
            name: "files",
            properties: ["name", "size"]
        }, {
            name: "payments",
            properties: ["sum", "roleID", "projectID", "number", "date", "creatorID", "comments", "workID", "isAdvance", "contractorID", "walletID", "invoiceNumber", "walletName", "invoiceID"],
            belongs: ["project", { name: "work", setName: "projectWorks" }, "contractor", "invoice"]
        }, {
            name: "contractors",
            properties: ["address", "changeDate", "changerID", "createDate", "creatorID", "deleted", "name", "roleID", "typeID", "subTypeID", "departmentID"],
            hasMany: [{ name: "projects", fkProperty: "contractorID" }, { name: "contactPersons" }, { name: "contracts" }, { name: "works", setName: "projectWorks" }, "department"]
        }, {
            name: "contracts",
            properties: ["comments", "contractorID", "createDate", "creatorID", "dateSign", "number", "originalExists", "projectID", "roleID", "parentID", "dateEnd"],
            belongs: [{ name: "project" }, { name: "contractor" }],
            hasMany: [{ name: "acts" }]
        }, {
            name: "acts",
            properties: ["comments", "contractID", "createDate", "creatorID", "dateSign", "number", "originalExists", "signed"],
            belongs: [{ name: "contract" }]
        }, {
            name: "daysFromTypes",
            properties: ["name", "sysName"]
        }, {
            name: "contactPersons",
            properties: ["archived", "comments", "contractorID", "deleted", "isMain", "name", "patronymic", "position", "surname"],
            belongs: [{ name: "contractor" }],
            hasMany: [{ name: "contacts", fkProperty: "personID" }]
        }, {
            name: "contacts",
            properties: ["typeID", "text", "personID"],
            belongs: [{ name: "person", setName: "contactPersons" }, { name: "type", setName: "contactTypes" }]
        }, {
            name: "contactTypes",
            properties: ["name", "sysName", "parentID", "deleted", "orderNumber"],
            belongs: [{ name: "parent", setName: "contactTypes" }]
        }, {
            name: "workStages",
            properties: ["name", "shortName", "deleted", "orderNumber", "categoryID"],
            hasMany: [{ name: "stages", setName: "projectStages", fkProperty: "stageID" }]
        }, {
            name: "projectStages",
            properties: ["projectID", "stageID"],
            belongs: [{ name: "project" }, { name: "stage", setName: "workStages" }]
        }, {
            name: "projectWorks",
            properties: ["comments", "contractID", "contractorExists", "contractorID", "cost", "typeID", "payedSum", "createDate", "code", "contractorVat", "kickback", "costContractor",
            "projectID", "dateEnd", "daysEnd", "daysTypeID", "daysFromTypeID", "advanceDate", "advanceSum", "factor", "count", "price", "unitName", "name", "orderNumber", "demountTypeID", "demountRate"],
            belongs: ["project", "contract", "contractor", { name: "type", setName: "workTypes" }, "demountType"],
            hasMany: [{ name: "payments", fkProperty: "workID" }]
        }, {
            name: "projectEmployees",
            properties: ["comments", "employeeID", "projectID", "employeeName"],
            belongs: [{ name: "employee" }, { name: "project" }]
        }, {
            name: "workTypes",
            properties: ["comments", "deleted", "name", "shortName", "customerID", "orderNumber", "code", "unitName", "price", "customerName"]
        }, {
            name: "users",
            properties: ["fullName", "managerFee", "roleID", "deleted", "blocked"]
        }, {
            name: "expenses",
            properties: ["comments", "creatorID", "createDate", "date", "name", "sum", "typeID", "walletID", "walletName", "parentID", "periodSum", "count", "price", "employeeName", "projectName", "projectID",
                "employeeID", "creatorName", "salaryEmployeeName", "salaryEmployeeID", "readOnly", "dispatchID", "frozen"],
            belongs: [{ name: "type", setName: "expenseTypes" }, "wallet", "employee"]
        }, {
            name: "expenseTypes",
            properties: ["name", "orderNumber", "deleted", "unitName", "categoryID", "price", "defaultWalletID", "walletEditable", "walletName", "forSalary"],
            belongs: [{ name: "category", setName: "expenseCategories", fkProperty: "categoryID" }]
        }, {
            name: "expenseCategories",
            className: "expenseCategory",
            properties: ["name", "orderNumber", "deleted"],
            hasMany: [{ name: "expenseTypes", fkProperty: "categoryID" }]
        }, {
            name: "employees",
            properties: ["surname", "name", "patronymic", "deleted", "walletID", "walletName", "fullName"]
        }, {
            name: "refbooks",
            properties: ["comments", "name", "deleted", "orderNumber", "typeID"],
            hasMany: [{ name: "stages", setName: "workStages", fkProperty: "categoryID" }]
        }, {
            name: "wallets",
            mode: "expenses",
            properties: ["name", "orderNumber", "deleted", "typeID"]
        }, {
            name: "projectStatuses", className: "projectStatus",
            properties: ["name", "color", "orderNumber"]
        }, {
            name: "projectTypes", className: "projectType",
            properties: ["name", "orderNumber"]
        }, {
            name: "projectNotes",
            properties: ["text", "userID", 'userName', "date", "projectID", "frozen"]
        }, {
            name: "invoices",
            properties: ["date", "drawnDate", "changeDate", "projectID", "amount", "nulled", "number", "comments", "leftAmount", "paidAmount"],
            hasMany: [{ name: "payments" }]
        }]
    });


    koModel.createInvoicePayment = function (invoice) {
        var payment = koModel.createPayment();
        payment.invoiceID(invoice.id());
        payment.invoiceNumber(invoice.number());
        payment.sum(invoice.leftAmount());
    }

    model.events.koCreated.attach(function (e) {
        if (e.className == "project") {
            e.ko.paymentsLoaded = ko.obs(true);
            e.ko.include(["contractor", "subcontractor", "contracts", "works", "stages", "allPayments", "contract", "responsible", "projectFiles", "status", "invoices"]);
            e.ko.payments = ko.cmp(function () {
                return e.ko.allPayments().where("val=>val.roleID()==1");
            });
            e.ko.contractorPayments = ko.cmp(function () {
                return e.ko.allPayments().where("val=>val.roleID()==2");
            });
            e.ko.advancePayment = ko.cmp(function () {
                return e.ko.payments().first("val=>val.isAdvance()");
            });
            e.ko.worksCost = ko.cmp(function () { return e.ko.works().sum("val=>val.contractorExists()?val.costContractor()*1:0"); });
            e.ko.cost = ko.cmp(function () { return e.ko.works().sum("val=>val.cost()"); });

            e.ko.actsLoaded = ko.obs(false);
            e.ko.incomeSum = ko.cmp(function () {
                if (e.ko.paymentsLoaded()) {
                    return e.ko.payments().sum("val=>val.sum()"); // +e.ko.sumAdvance() * 1;
                } else {
                    return e.entity.incomeSum(); // +e.ko.sumAdvance() * 1;
                }
            });
            e.ko.outgoingSum = ko.cmp(function () {
                if (e.ko.paymentsLoaded()) {
                    return e.ko.contractorPayments().sum("val=>val.sum()"); // +e.ko.sumAdvance() * 1;
                } else {
                    return e.entity.outgoingSum(); // +e.ko.sumAdvance() * 1;
                }
            });
            e.ko.invoicesDebt = ko.cmp(function () {
                if (e.ko.paymentsLoaded()) {
                    return e.ko.invoices().sum("val=>val.leftAmount()");
                } else {
                    return e.entity.invoicesDebt();
                }
            });

            e.ko.advanceDate = ko.cmp(function () {
                if (e.ko.paymentsLoaded()) {
                    return e.ko.advancePayment() ? e.ko.advancePayment().date() : "";
                } else {
                    return e.entity.advanceDate();
                }
            });
            e.ko.advanceSum = ko.cmp(function () {
                if (e.ko.paymentsLoaded()) {
                    return e.ko.advancePayment() ? e.ko.advancePayment().sum() : "";
                } else {
                    return e.entity.advanceSum();
                }
            });
            e.ko.gain = ko.obs(0);
            e.ko.managerFeeAmount = ko.cmp(function () {
                return (e.ko.cost() - e.ko.worksCost() - e.ko.expensesSum() + e.ko.managerFeePaid()) / 100 * e.ko.managerFee();
            });

            ko.toDobs([e.ko.gain, e.ko.cost, e.ko.incomeSum, e.ko.worksCost, e.ko.advanceSum, e.ko.outgoingSum, e.ko.managerFee]);

            e.ko.recalcEnd = true;
            e.ko.dateEnd.subscribe(function () { koModel.recalcDaysEnd(e.ko); });
            e.ko.daysEnd.subscribe(function () { koModel.recalcDateEnd(e.ko); });
            e.ko.daysTypeID.subscribe(function () { koModel.recalcDateEnd(e.ko); });
            e.ko.daysFromTypeID.subscribe(function () { koModel.recalcDateEnd(e.ko); });

            e.ko.leftIncome = ko.cmp(function () {
                var incomes = e.ko.incomeSum();
                if (ko.isObs(incomes)) {
                    incomes = incomes();
                }
                return e.ko.cost() * 1 - incomes;
            });
            e.ko.leftOutgoing = ko.cmp(function () { return e.ko.worksCost() - e.ko.outgoingSum(); });
            ko.toDobs([e.ko.leftIncome, e.ko.leftOutgoing]);

            e.ko.contractorID.subscribe(function () {
                if (e.entity.inParse)
                    return;
                if (e.ko.contract()) {
                    e.ko.contract().contractorID(e.ko.contractorID());
                }
                koModel.loadContracts();

                //e.ko.contractorContractID("");
                //e.ko.contractorContractPageID("");
                //e.ko.ccName("");
                //e.ko.ccpName("");
            });
            var cnt = data.contractors.first("val=>val.id=='" + e.ko.contractorID() + "'");
            e.ko.contractorTypeID = ko.obs(cnt ? cnt.typeID : "");
            e.ko.contractorTypeID.subscribe(function (value) {
                if (e.ko.contractor() && value != e.ko.contractor().typeID()) {
                    e.ko.contractorID("");
                }
                if (e.ko.contract()) {
                    e.ko.contract().contractorID(e.ko.contractorID());
                }
            });
            e.ko.subcontractorTypeID = ko.obs(e.ko.subcontractor() ? e.ko.subcontractor().typeID() : "");
            e.ko.subcontractorTypeID.subscribe(function (value) {
                if (e.ko.subcontractor() && value != e.ko.subcontractor().typeID()) {
                    e.ko.subcontractorID("");
                }
            });
            e.ko.responsibleID.subscribe(function (value) {
                if (e.ko.responsible()) {
                    e.ko.managerFee(e.ko.responsible().managerFee());
                }
            });

            e.ko.missingDocuments = ko.cmp(function () {
                var result = [];
                var dateEnd = e.ko.dateEnd();
                var contract = e.ko.contract();
                var acts = contract ? contract.acts() : [];

                if (contract && !contract.originalExists()) {
                    result.push("договор");
                    if (dateEnd && parseDate(dateEnd) < new Date() && acts.any("val=>!val.originalExists()")) {
                        result.push(", ");
                        result.push("акт");
                    }
                } else if (contract && dateEnd && parseDate(dateEnd) < new Date() && acts.any("val=>!val.originalExists()")) {
                    result.push("акт");
                }
                return result.join("");
            });
            e.ko.frameContracts = ko.cmp(function () {
                var contractor = e.ko.contractor();
                return contractor ? contractor.contracts().where("val=>val.roleID()==3") : [];
            });
        } else if (e.className == "contractor") {
            e.ko.include(["contactPersons", "contracts", "works"]);
            e.ko.mainContactPerson = ko.cmp(function () {
                var cp = e.ko.contactPersons().first("val=>val.isMain()");
                return cp ? cp : {};
            });
        } else if (e.className == "contract") {
            e.ko.include(["acts", "contractor"]);
            e.ko.name = ko.cmp(function () {
                return ["№", e.ko.number(), " (", e.ko.dateSign(), " -- ", e.ko.dateEnd(), ")"].join("");
            });
        } else if (e.className == "contactPerson") {
            e.ko.include("contacts");
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
        } else if (e.className == "workStage") {
            e.ko.include("stages");
            e.ko.checked = ko.cmp({
                read: function () {
                    return e.ko.stages().any("val=>val.projectID()==" + koModel.projectID);
                },
                write: function (value) {
                    var projectStage = koModel.project.stages().first("val=>val.stageID()==" + e.ko.id());
                    if (!projectStage) {
                        projectStage = model.projectStages.create();
                        projectStage.stageID(e.ko.id());
                        projectStage.projectID(koModel.project.id());
                    } else if (projectStage) {
                        projectStage.entity.remove();
                    }
                }
            });
        } else if (e.className == "projectStage") {
            e.ko.include(["stage"]);
        } else if (e.className == "projectWork") {
            e.ko.paymentsLoaded = ko.obs(false);
            e.ko.include(["contract", "contractor", "payments", "type", "project"]);//, "demountType"]);

            e.ko.advancePayment = ko.cmp(function () {
                return e.ko.payments().first("val=>val.isAdvance()");
            });

            e.ko.payedSum = ko.cmp(function () {
                if (e.ko.id() < 0 || e.ko.paymentsLoaded() || (e.ko.project() && e.ko.project().paymentsLoaded())) {
                    return e.ko.payments().sum("val=>val.sum()");
                } else {
                    return e.entity.payedSum();
                }
            });

            e.ko.advanceDate = ko.cmp(function () {
                if (e.ko.id() < 0 || e.ko.paymentsLoaded() || (e.ko.project() && e.ko.project().paymentsLoaded())) {
                    return e.ko.advancePayment() ? e.ko.advancePayment().date() : "";
                } else {
                    return e.entity.advanceDate();
                }
            });
            e.ko.advanceSum = ko.cmp(function () {
                if (e.ko.id() < 0 || e.ko.paymentsLoaded() || (e.ko.project() && e.ko.project().paymentsLoaded())) {
                    return e.ko.advancePayment() ? e.ko.advancePayment().sum() : "";
                } else {
                    return e.entity.advanceSum();
                }
            });

            e.ko.costContractor.subscribe(function (value) {
                if (e.entity.inParse || e.ko.defer || isEmpty(value + ""))
                    return;
                e.ko.defer = true;
                var cost = e.ko.cost();
                cost = cost * 1;
                var v = (cost > 0) ? Math.floor((cost - value * 1) / cost * 100 * 100) / 100 : 0;
                e.ko.factor(v);
                e.ko.defer = false;
            });

            ko.toDDobs([e.ko.cost, e.ko.payedSum, e.ko.advanceSum, e.ko.cost, e.ko.costContractor, e.ko.factor, e.ko.count, e.ko.price], true);

            e.ko.recalcEnd = true;
            e.ko.defer = false;
            e.ko.dateEnd.subscribe(function () { koModel.recalcDaysEnd(e.ko); });
            e.ko.daysEnd.subscribe(function () { koModel.recalcDateEnd(e.ko); });
            e.ko.daysTypeID.subscribe(function () { koModel.recalcDateEnd(e.ko); });
            e.ko.daysFromTypeID.subscribe(function () { koModel.recalcDateEnd(e.ko); });

            e.ko.factor.subscribe(function (value) {
                if (e.entity.inParse || e.ko.defer || isEmpty(value + ""))
                    return;
                e.ko.defer = true;
                var cost = e.ko.cost();
                cost = cost * 1;

                var v = cost * (100 - (e.ko.contractorExists() ? e.ko.factor() : 0));
                v = Math.floor(v) / 100;
                e.ko.costContractor(v);
                e.ko.defer = false;
            });

            e.ko.count.subscribe(function (value) {
                if (e.entity.inParse)
                    return;
                e.ko.cost(e.ko.count() * e.ko.price());
            });
            e.ko.price.subscribe(function (value) {
                if (e.entity.inParse)
                    return;
                e.ko.cost(e.ko.count() * e.ko.price());
            });

            e.ko.typeID.subscribe(function (value) {
                if (value == undefined) {
                    e.ko.typeID("");
                }
                var type = e.ko.type();
                //var demountType = e.ko.demountType();
                if (e.entity.inParse || !type)
                    return;
                e.ko.price(/*demountType && demountType.contractorRate() > 0 ? type.contractorPrice() / 100 * demountType.contractorRate() : */type.price());
                e.ko.code(type.code());
                e.ko.unitName(type.unitName());
                e.ko.name(type.name());
            });
            e.ko.contractorExists.subscribe(function (value) {
                if (!value) {
                    e.ko.defer = true;
                    e.ko.costContractor(0);
                    e.ko.factor(0);
                    e.ko.contractorID("");
                    e.ko.contractID("");
                    e.ko.defer = false;
                }
            });
            e.ko.contractExists = ko.cmp({
                read: function () { return e.ko.contractID() > 0; },
                write: function (value) {
                    if (value && !e.ko.contractID()) {
                        koModel.editWorkDocuments(e.ko);
                    } else {
                        e.ko.contractID("");
                    }
                }
            });
            e.ko.contractorID.subscribe(function (value, arguments) {
                var contractID = "";
                if (e.ko.contractor()) {
                    //var contract = e.ko.contractor().contracts().first("val=>val.roleID()==2&&val.projectID()=='" + e.ko.projectID() + "'");
                    //contractID = contract ? contract.id() : "";
                    e.ko.contractorExists(true);
                }
                e.ko.contractID(contractID);
            });

            e.ko.missingDocuments = ko.cmp(function () {
                var result = [];
                var dateEnd = e.ko.dateEnd();
                var contract = e.ko.contract();
                var acts = contract ? contract.acts() : [];

                if (contract && !contract.originalExists()) {
                    result.push("договор");
                    if (dateEnd && parseDate(dateEnd) < new Date() && acts.any("val=>!val.originalExists()")) {
                        result.push(", ");
                        result.push("акт");
                    }
                } else if (contract && dateEnd && parseDate(dateEnd) < new Date() && acts.any("val=>!val.originalExists()")) {
                    result.push("акт");
                }
                return result.join("");
            });
            if (e.ko.id() < 0) {
                e.ko.count(1);
            }
        } else if (e.className == "payment") {
            ko.toDobs(e.ko.sum);
            e.ko.include(["work", "project", "contractor", "invoice"]);
            if (e.ko.work()) {
                var work = e.ko.work();
            }
        } else if (e.className == "invoice") {
            e.ko.include(["payments"]);
            //e.ko.paidAmount = ko.cmp(function () {
            //    var payments = e.ko.payments();
            //    return payments.sum("val=>val.sum()");
            //});
            ko.toDobs([e.ko.amount, e.ko.paidAmount]);
        } else if (e.className == "workType") {
        } else if (e.className == "projectFile") {
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
                e.ko.projectID(koModel.project.id());
            }
        } else if (e.className == "refbook") {
            e.ko.include("stages");
        } else if (e.className == "expense") {
            e.ko.readOnly = ko.obs(e.ko.readOnly() || e.ko.frozen() && host.ur != host.roles.admin);
        } else if (e.className == "projectNote") {
            e.ko.readOnly = ko.obs(e.ko.frozen() && host.ur != host.roles.admin);
        }
    });
    return model;
};

$("#divProject").dialog({
    autoOpen: false,
    draggable: true,
    resizable: false,
    modal: true,
    width: 550
});

function initProjectInvoices(koModel, model, data) {
    var sn = "/Project/Index#tblInvoices";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value);
        } catch (ex) {
            cols = null;
        }
    }

    koModel.projectInvoicesCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.invoices,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divProjectInvoices"),
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
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
        }, {
            title: "&nbsp;",
            name: "addPayment",
            showOnly: true,
            sortable: false,
            showTemplate: "#scrAddPayment"
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
    
    koModel.projectInvoicesCrud.events.created.attach(function (e) {
        e.row.projectID(koModel.project.id());
        e.row.date((new Date()).toSds());
        e.row.drawnDate((new Date()).toSds());
        e.row.changeDate((new Date()).toSds());
        e.row.number((new Date()).toSds());

        var dlg = koModel.projectInvoicesCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание счета" });
    });

    koModel.projectInvoicesCrud.events.edited.attach(function (e) {
        var dlg = koModel.projectInvoicesCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование счета" });
    });

    koModel.projectInvoicesCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    if (!cols) {
        koModel.projectInvoicesCrud.getPager().refresh();
    }
};

function initProjectPayments(koModel, model, data) {
    var sn = "/Project/Index#tblPayments";
    var s = data.settings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value);
        } catch (ex) {
            cols = null;
        }
    }

    koModel.projectPaymentsCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.payments,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: ".container",
        gridPadding: 10,
        container: $("#divProjectPayments"),
        gridFilter: true,
        create: true,
        edit: true,
        remove: true,
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
            type: "autocomplete",
            method: "loadInvoices",
            filterName: "invoice.Number",
            filterType: "string",
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
            type: "autocomplete",
            method: "loadWallets",
            filterName: "wallet.Name",
            filterType: "string",
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
        }, {
            property: "roleID",
            value: 1,
            type: "number"
        }]
    });

    koModel.projectPaymentsCrud.events.updated.attach(function (e) {
        var invoice = e.row.invoice();
        if (invoice) {
            invoice.changeDate(new Date());
        }
    });

    koModel.projectPaymentsCrud.events.created.attach(function (e) {
        e.row.projectID(koModel.project.id());
        e.row.roleID(1);
        e.row.date((new Date()).toSds());
        e.row.number((new Date()).toSds());

        var dlg = koModel.projectPaymentsCrud.getEditor().getDialog();
        dlg.dialog({ title: "Создание платежа" });

    });

    koModel.projectPaymentsCrud.events.edited.attach(function (e) {
        var dlg = koModel.projectPaymentsCrud.getEditor().getDialog();
        dlg.dialog({ title: "Редактирование счета" });
    });

    koModel.projectPaymentsCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    if (!cols) {
        koModel.projectPaymentsCrud.getPager().refresh();
    }
};