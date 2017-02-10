var koModel = {
    selectedArray: ko.obsa([]),
    grid: null,
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "refbooks",
            properties: ["comments", "name", "deleted", "orderNumber", "typeID"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "refbook") {

        }
    });

    koModel.refbookType = data.refbookType;
    koModel.grid = $.fn.koGrid.getSaveSettingsObject("/Helpers/Refbooks/" + koModel.refbookType.id + "#tblRefbooks", "tblRefbooks");

    model.refreshData(data);
    model.toKo(koModel);

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;


        top.busy("UpdateRefbooks");
        model.update(function () {
            top.free("UpdateRefbooks");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    koModel.create = function () {
        var refbook = model.refbooks.create();
        refbook.typeID(koModel.refbookType.id);
    };

    koModel.remove = function (row) {
        var rows = [];
        if (row.entity) {
            koModel.selectedArray([]);
            rows.push(row);
        } else {
            rows = koModel.selectedArray().select(function (it) { return koModel.refbooks().first("val=>val.id()==" + it); });
        }

        var names = ["запись", "записи", "записей"];
        var message = ["Вы действительно хотите удалить ",
                       rows.length == 1 ? names[0] + " " + rows[0].name() : rows.length + " " + i18n.declineCount(rows.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (rows.length == 0 || (rows.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }

        rows.forEach(function (it) {
            if (it.id() > 0) {
                it.name(it.name() ? it.name() : "deleted");
                if (it.shortName) {
                    it.shortName(it.shortName() ? it.shortName() : "deleted");
                }
                it.deleted(true);
            } else {
                it.entity.remove();
            }
        });
        koModel.updateAll(function () {
            rows.forEach(function (it) {
                it.entity.detach();
            });
            koModel.selectedArray([]);
        });
    };

    koModel.toExcel = function () {
        var rows = koModel.refbooks();
        if (koModel.selectedArray().any()) {
            rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
        }
        var headers = ["Номер", "Название", "Примечание"];

        var name = [koModel.refbookType.name, "_", (new Date()).toSds()].join("");
        rows = rows.select(function (it) {
            return [it.orderNumber(), it.name(), it.comments()];
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    var gridSettings = data.userSettings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblRefbooks").koGrid({
        koTemplateID: "trRefbook",
        headerContainer: $("#divRefbooksHeader"),
        styleID: "stlRefbooksGrid",
        tableID: "tblRefbooks",
        columns: gridSettings || [],
        sortable: true,
        source: koModel.refbooks,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    ko.apply(koModel);
});