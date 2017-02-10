var context = {
    defer: true,
    transfer: { selectedArray: ko.obsa([]) },
    filter: { dateFrom: null, dateTo: null, walletFromID: ko.obs(""), creatorID: ko.obs("") },
    grid: $.fn.koGrid.getSaveSettingsObject(host.p + "#tblTransfers", "tblTransfers"),
    mainKo: window.koModel
};
$(function () {
    window.koModel.transfersKoModel = context;

    var koModel = context;
    var data = eval("(" + $("#scrTransfersPartialData").text() + ")");
    var model = koModel.mainKo.getModel();
    data = toJsObject(data);

    koModel.wallets = koModel.mainKo.wallets;
    koModel.walletRatios = koModel.mainKo.walletRatios;
    koModel.transfers = koModel.mainKo.transfers;

    model.events.koCreated.attach(function (e) {
        if (e.className == "wallet") {
            e.ko.include(["walletFromRatios", "walletToRatios"]);
        } else if (e.className == "transfer") {
            e.ko.include(["walletFrom", "walletTo"]);
            //ko.toDDobs([e.ko.ratio, e.ko.amountSent, e.ko.amountReceived], true);
            ko.toNobs([e.ko.amountSent, e.ko.amountReceived]);
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
            e.ko.readOnly = ko.obs(e.ko.frozen() && host.ur != host.roles.admin);
        }
    });
    model.addData(data);

    koModel.pager = new ejs.remotePager({
        set: model.transfers,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: [{
            property: "date",
            value: function () { return typeof koModel.filter.dateFrom == "function" ? koModel.filter.dateFrom() : koModel.filter.dateFrom; },
            type: "date",
            condition: ">="
        }, {
            property: "date",
            value: function () { return typeof koModel.filter.dateTo == "function" ? koModel.filter.dateTo() : koModel.filter.dateTo; },
            type: "date",
            condition: "<="
        }, {
            property: "walletFromID",
            value: koModel.filter.walletFromID,
            type: "number",
            condition: "=="
        }, {
            property: "creatorID",
            value: koModel.filter.creatorID,
            type: "number",
            condition: "=="
        }]
    });

    koModel.pager.events.pageChanging.attach(function (e) {
        e.cancel = koModel.defer;
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.refresh = function () {
        koModel.defer = false;
        koModel.transfer.selectedArray([]);
        model.transfers.refreshData([]);
        koModel.pager.goTo(0);
    };

    koModel.transfer.selectedTotal = ko.cmp(function () {
        var transfers = koModel.transfer.selectedArray().select(function (it) { return koModel.transfers().first("val=>val.id()==" + it); });
        return transfers.sum("val=>val.amountSent()");
    });

    koModel.transfer.create = function () {
        var t = model.transfers.create();
        t.walletFromID(koModel.filter.walletFromID());
    };

    koModel.transfer.remove = function (row) {
        var message = ["Вы действительно хотите удалить запись ", row.date(), " (" + row.amountSent.text() + ")", "?"].join("");

        if (row.id() > 0 && !confirm(message)) {
            return;
        }

        koModel.transfer.selectedArray([]);

        row.entity.remove();
        koModel.mainKo.updateAll();
    };
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

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblTransfers").koGrid({
        koTemplateID: "trTransfer",
        headerContainer: $("#divTransfersHeader"),
        styleID: "stlTransfersGrid",
        tableID: "tblTransfers",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        disallowSort: ["Save", "Select", "Index"]
    });

    ko.apply(koModel, $("#divTransfersPartial").get(0));
});