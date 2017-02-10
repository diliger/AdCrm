var koModel = {
    selectedArray: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/Helpers/WorkStages#tblWorkStages", "tblWorkStages"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "workStages",
            properties: ["comments", "name", "shortName", "deleted", "orderNumber", "categoryID", "managerFee"],
            belongs: [{ name: "category", setName: "refbooks" }]
        }, {
            name: "refbooks",
            properties: ["comments", "name", "deleted", "orderNumber", "typeID"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "workStage") {
            e.ko.include("category");
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;


        top.busy("UpdateWorkStages");
        model.update(function () {
            top.free("UpdateWorkStages");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    koModel.stageCategories = function (id) {
        var refbooks = koModel.refbooks().where("val=>val.typeID()==1");
        refbooks = refbooks.where("val=>!val.deleted()||val.id()=='" + id + "'").orderBy("val=>val.orderNumber()");
        return refbooks;
    };

    koModel.create = function () {
        var workStage = model.workStages.create();
    };

    koModel.remove = function (row) {
        var rows = [];
        if (row.entity) {
            koModel.selectedArray([]);
            rows.push(row);
        } else {
            rows = koModel.selectedArray().select(function (it) { return koModel.workStages().first("val=>val.id()==" + it); });
        }

        var names = ["стадию", "стадии", "стадий"];
        var message = ["Вы действительно хотите удалить ",
                       rows.length == 1 ? names[0] + " " + rows[0].name() : rows.length + " " + i18n.declineCount(rows.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (rows.length == 0 || (rows.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }

        rows.forEach(function (it) {
            if (it.id() > 0) {
                it.name(it.name() ? it.name() : "deleted");
                it.shortName(it.shortName() ? it.shortName() : "deleted");

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
        var rows = koModel.workStages();
        if (koModel.selectedArray().any()) {
            rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
        }
        var headers = ["Номер", "Категория", "Название", "Сокращенное", "Примечание"];

        var name = ["Стадии_", (new Date()).toSds()].join("");
        rows = rows.select(function (it) {
            return [it.orderNumber(), it.category() ? it.category().name() : "", it.name(), it.shortName(), it.comments()];
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblWorkStages").koGrid({
        koTemplateID: "trWorkStage",
        headerContainer: $("#divWorkStagesHeader"),
        styleID: "stlWorkStagesGrid",
        tableID: "tblWorkStages",
        columns: gridSettings || [],
        sortable: true,
        source: koModel.workStages,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    ko.apply(koModel);
});