var koModel = {
    filter: {
        text: ko.obs("")
    }
};

$(function () {
    ko.precision(4);
    var data = ejs.toJsObject(eval("(" + $("#scrData").html() + ")"));
    var model = new ejs.model({
        sets: [{
            name: "wallets",
            properties: ["name", "orderNumber", "deleted", "typeID", "balance", "comments"],
            belongs: [{ name: "type", setName: "statbooks" }],
            hasMany: ["employeeWallets", { name: "walletFromRatios", setName: "walletRatios", fkProperty: "walletFromID" }, { name: "walletToRatios", setName: "walletRatios", fkProperty: "walletToID" }]
        }, {
            name: "statbooks",
            properties: ["name", "needDescription", "descriptionCaption", "needDate", "dateCaption", "deleted", "sysName", "typeID", "orderNumber", "color"]
        }, {
            name: "employeeWallets",
            properties: ["walletID", "employeeID", "expense", "employeeName", "transferFrom", "transferTo"]
        }, {
            name: "employees",
            properties: ["fullName"]
        }, {
            name: "walletRatios",
            properties: ["walletFromID", "walletToID", "ratio", "walletToName"]
        }, {
            name: "transfers",
            properties: ["walletFromID", "walletToID", "ratio", "walletToName", "walletFromName", "date", "amountSent", "amountReceived", "comments", "frozen"],
            belongs: [{ name: "walletFrom", setName: "wallets" }, { name: "walletTo", setName: "wallets" }],
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "wallet") {
            e.ko.include(["type", "employeeWallets", "walletFromRatios", "walletToRatios"]);
            ko.toDobs([e.ko.balance]);
        } else if (e.className == "walletRatio") {
            ko.toDDobs([e.ko.ratio], true);
        } else if (e.className == "transfer") {
            e.ko.include(["walletFrom", "walletTo"]);
            ko.toDobs([e.ko.amountSent, e.ko.amountReceived]);
            if (e.ko.id() < 0) {
                e.ko.ratio(1);
                e.ko.date(new Date().toSds());
            }
            e.ko.walletFromID.subscribe(function (value) {
                if (!value || e.entity.inParse)
                    return;
                var ratio = koModel.getWalletRatio(e.ko.walletFrom(), e.ko.walletTo());
                if (ratio === 0 || ratio > 0) {
                    e.ko.ratio(ratio);
                }
            });
            e.ko.walletToID.subscribe(function (value) {
                if (!value || e.entity.inParse)
                    return;
                var ratio = koModel.getWalletRatio(e.ko.walletFrom(), e.ko.walletTo());
                if (ratio === 0 || ratio > 0) {
                    e.ko.ratio(ratio);
                }
            });
            e.ko.amountSent.subscribe(function (value) {
                if (!value || e.entity.inParse || !e.ko.ratio())
                    return;
                e.ko.amountReceived(Math.round(e.ko.ratio() * value * 100) / 100);
            });
            e.ko.ratio.subscribe(function (value) {
                if (!value || e.entity.inParse || !e.ko.amountSent())
                    return;
                e.ko.amountReceived(Math.round(e.ko.amountSent() * value * 100) / 100);
            });
            e.ko.amountReceived.subscribe(function (value) {
                if (!value || e.entity.inParse || !e.ko.amountSent())
                    return;
                e.ko.ratio(Math.round(e.ko.amountReceived() / e.ko.amountSent() * 10000) / 10000);
            });
            e.ko.readOnly = ko.obs(e.ko.frozen() && host.ur != host.roles.admin || false);
            e.ko.deletable = ko.obs(!e.ko.readOnly());
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.activeStatbooks = function (id, tid) {
        var statbooks = koModel.statbooks().where("val=>val.typeID()==" + tid);
        statbooks = statbooks.where("val=>!val.deleted()||val.id()=='" + id + "'").orderBy("val=>val.orderNumber()");
        return statbooks;
    };
    koModel.walletTypes = function (id) { return koModel.activeStatbooks(id, 1).where("val=>val.id()!=101"); };

    koModel.loadWalletsFrom = function (request, callback, row) {
        return koModel.loadWallets(request, callback, row, "walletFromName");
    };
    koModel.loadWalletsTo = function (request, callback, row) {
        return koModel.loadWallets(request, callback, row, "walletToName");
    };
    koModel.loadWallets = function (request, callback, row, p) {
        var name = row[p]().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool")];

        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.wallets, where, [ejs.cop("name")], 20, "", [ejs.cip(model.walletRatios, true, "", "WalletFromRatios"), ejs.cip(model.walletRatios, true, "", "WalletToRatios")]), function (result) {
            model.addData(result.collections);
            callback(result.collections.wallets.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };
    koModel.getWalletRatio = function (walletFrom, walletTo) {
        if (!walletFrom || !walletTo)
            return null;
        var ratio = walletFrom.walletFromRatios().first("val=>val.walletToID()==" + walletTo.id() + "||!val.walletToID()");
        if (ratio) {
            return ratio.ratio();
        }
        ratio = walletTo.walletToRatios().first("val=>val.walletFromID()==" + walletFrom.id() + "||!val.walletFromID()");
        if (ratio) {
            return ratio.ratio();
        }
        return null;
    };

    ejs.crud.getDefaultTextProvider = function (options) {
        var provider = new ejs.crud.defaultTextProvider();
        provider.unableDelete = "Вы не можете удалить эту запись!";
        return provider;
    };

    var sn = "/Transfers/Index#tblTransfers";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }
    var filters = [];
    if (host.eid > 0 && host.ur > host.roles.boss) {
        filters.push({ property: "WalletFromAvailable", value: host.eid, type: "number" });
        filters.push({ property: "WalletToAvailable", value: host.eid, type: "number", operand: "or" });
    }
    koModel.transfersCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.transfers,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        gridParentScroll: "#divRightContent",
        gridPadding: 10,
        gridFilter: true,
        container: $("#divTransfers"),
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 20,
        pure: true,
        selectMany: true,
        excel: "Транзакции",
        columns:
        [{
            title: "С кошелька",
            name: "walletFromID",
            value: "walletFromName",
            type: "autocomplete",
            method: "loadWalletsFrom",
            orderBy: "walletFrom.Name",
            disable: "readOnly",
            filter: true,
            filterName: "walletFrom.Name",
            required: true
        }, {
            title: "На кошелек",
            name: "walletToID",
            value: "walletToName",
            type: "autocomplete",
            method: "loadWalletsTo",
            orderBy: "walletTo.Name",
            disable: "readOnly",
            filter: true,
            filterName: "walletTo.Name",
            required: true
        }, {
            title: "Дата",
            name: "date",
            type: "date",
            disable: "readOnly",
            filter: true,
            required: true
        }, {
            title: "Сумма, отправлено",
            name: "amountSent",
            value: "amountSent.text",
            disable: "readOnly",
            filter: true,
            filterType: "number",
            required: true
        }, {
            title: "Сумма, доставлено",
            name: "amountReceived",
            value: "amountReceived.text",
            disable: "readOnly",
            filter: true,
            filterType: "number",
            required: true
            //}, {
            //    title: "Коэффициент",
            //    name: "ratio",
            //    value: "ratio.text",
            //    filter: true,
            //    filterType: "number",
            //    required: true
        }, {
            title: "Примечание",
            name: "comments",
            type: "textarea",
            disable: "readOnly",
            filter: true,
            filterType: "string"
        }, {
            title: "Печать",
            name: "actions",
            excel: false,
            showOnly: true,
            sortable: false,
            template: "#scrActions"
        }], filters: filters
    });

    koModel.transfersCrud.events.editing.attach(function (e) {
        var btn = koModel.transfersCrud.getEditor().getDialog().parent().find("div.ui-dialog-buttonset button:first");
        if (e.row.readOnly()) {
            btn.hide();
        } else {
            btn.show();
        }
    });

    koModel.transfersCrud.events.updating.attach(function (e) {

    });

    koModel.transfersCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    if (!cols) {
        koModel.transfersCrud.getPager().refresh();
    }

    window.setSize = function () {
        var h = $(window).height();
        var div = $(".right-content .container");
        div.css({ height: h - 40 - div.offset().top + "px" });
    };

    setSize();
    $(window).resize(function () {
        setSize();
    });

    ko.apply(koModel);
});