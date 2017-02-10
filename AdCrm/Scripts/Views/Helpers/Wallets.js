var koModel = {
};

$(function () {
    ko.precision(4);
    var data = ejs.toJsObject(eval("(" + $("#scrData").html() + ")"));
    var model = new ejs.model({
        sets: [{
            name: "wallets",
            properties: ["name", "orderNumber", "deleted", "typeID", "balance", "comments", "initialBalance"],
            belongs: [{ name: "type", setName: "statbooks" }],
            hasMany: ["employeeWallets", { name: "walletRatios", fkProperty: "walletFromID" }]
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
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "wallet") {
            e.ko.include(["type", "employeeWallets", "walletRatios"]);
            ko.toDobs([e.ko.balance]);
        } else if (e.className == "walletRatio") {
            ko.toDDobs([e.ko.ratio], true);
        }
    });

    model.refreshData(data);
    model.toKo(koModel);
    koModel.balance = ko.cmp(function () {
        return koModel.wallets().sum("val=>val.balance()");
    });

    koModel.activeStatbooks = function (id, tid) {
        var statbooks = koModel.statbooks().where("val=>val.typeID()==" + tid);
        statbooks = statbooks.where("val=>!val.deleted()||val.id()=='" + id + "'").orderBy("val=>val.orderNumber()");
        return statbooks;
    };
    koModel.walletTypes = function (id) { return koModel.activeStatbooks(id, 1).where("val=>val.id()!=101"); };

    koModel.createEmployeeWallet = function (data) {
        var etu = model.employeeWallets.create().toKo();
        etu.walletID(data.id());
        etu.expense(true);
        etu.transferFrom(true);
        etu.transferTo(true);
    };
    koModel.removeEmployeeWallet = function (data) {
        if (data.id() < 0 || confirm("Вы действительно хотите удалить запись для сотрудника " + data.employeeName() + "?")) {
            data.entity.remove();
        }
    };

    koModel.createWalletRatio = function (data) {
        var etu = model.walletRatios.create().toKo();
        etu.walletFromID(data.id());
        etu.ratio(1);
    };
    koModel.removeWalletRatio = function (data) {
        if (data.id() < 0 || confirm("Вы действительно хотите удалить запись для кошелька " + data.walletToName() + "?")) {
            data.entity.remove();
        }
    };

    koModel.loadEmployees = function (request, callback, row) {
        var ids = koModel.wallet().employeeWallets().select("val=>val.employeeID()").where("val=>val>0");
        var name = row.employeeName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool")];
        if (ids.any()) {
            where.push(ejs.cwp("id", ids.length > 1 ? ids : ids[0], "!=", "number"));
        }

        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.employees.select(function (collection, result) {
            var items = result.allEntities.select(function (item) { return { label: item.fullName(), value: item.fullName(), source: item }; });
            callback(items);
        }, where, [ejs.cop("fullName")], 20);
    };

    koModel.loadWallets = function (request, callback, row) {
        var ids = koModel.wallet().walletRatios().select("val=>val.walletToID()").where("val=>val>0");
        var name = row.walletToName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        if (koModel.wallet().id() > 0) {
            ids.push(koModel.wallet().id());
        }

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("typeID", 101, "!=", "number")];
        if (ids.any()) {
            where.push(ejs.cwp("id", ids.length > 1 ? ids : ids[0], "!=", "number"));
        }

        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.wallets, where, [ejs.cop("name")], 20), function (result) {
            callback(result.collections.wallets.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };

    var sn = "/Helpers/Wallets#tblWallets";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.walletsCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.wallets,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        //gridParentScroll: "#body",
        gridPadding: 10,
        container: $("#divWallets"),
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: -1,
        pure: true,
        selectMany: true,
        excel: "Кошельки",
        removeField: "deleted",
        trcss: {
            invalid: "balance() < 0"
        },
        columns:
        [{
            title: "Название",
            name: "name",
            required: true
        }, {
            title: "Тип кошелька",
            name: "typeID",
            value: "type().name",
            orderBy: "type.Name",
            options: "walletTypes(typeID())",
            type: "select",
            required: true
        }, {
            title: "Начальный остаток",
            name: "initialBalance",
            align: "text-right",
            required: true
        }, {
            title: "Текущий остаток",
            name: "balance",
            disable: true,
            align: "text-right",
            required: true
        }, {
            title: "Порядковый номер",
            name: "orderNumber",
            type: "number"
        }, {
            title: "Дополнительно",
            name: "comments",
            type: "textarea"
        }, {
            title: "Доступы",
            name: "access",
            editOnly: true,
            editRowTemplate: "#scrAccessTemplate"
        }, {
            title: "Коэффициенты трансфера",
            name: "ratios",
            editOnly: true,
            editRowTemplate: "#scrRatioTemplate"
        }],
        filters: [{
            property: "employeeID",
            value: true,
            condition: "isNull"
        }]
    });

    koModel.walletsCrud.events.editing.attach(function (e) {
        ejs.busy("employeeWallets");
        model.employeeWallets.select(function () {
            ejs.free("employeeWallets");
        }, [ejs.cwp("walletID", e.row.id(), "=", "number")]);
        ejs.busy("walletRatios");
        model.walletRatios.select(function () {
            ejs.free("walletRatios");
        }, [ejs.cwp("walletFromID", e.row.id(), "=", "number")]);
    });

    koModel.walletsCrud.events.updating.attach(function (e) {
        var row = e.row;
        var ratios = row.walletRatios().where("val=>!val.walletToID()");
        if (ratios.length > 1) {
            e.cancel = true;
            ejs.alert("Можно создать только один коэффициент трансфера без выбора кошелька получателя!");
        }
    });

    koModel.walletsCrud.events.cancelled.attach(function (e) {
        model.cancelChanges();
    });

    if (!cols) {
        koModel.walletsCrud.getPager().refresh();
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