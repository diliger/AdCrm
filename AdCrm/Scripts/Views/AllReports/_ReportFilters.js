function localInitModel(koModel, data) {
    var model = new ejs.model({
        sets:
        [{
            name: "reportFilters",
            properties: ["name", "comments", "default", "reportID", "userID", "data"]
        }]
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


        top.busy("Update");
        model.update(function () {
            top.free("Update");
            if (typeof callback == "function") {
                callback();
            }
        });
    };
    return model;
};

function initFilters(koModel, model, data) {
    if (!model)
        model = typeof initModel == "function" ? initModel(koModel, data) : localInitModel(koModel, data);
    koModel.reportID = data.reportID;
    koModel.reportFilter = koModel.reportFilter || ko.obs();

    var div = $("#divFilter");
    var divFilters = $("#divFilters");

    koModel.filter.getData = function () {
        return ko.toJSON(koModel.filter);
    };

    koModel.filter.parse = function (filter, data, invert) {
        filter = filter || koModel.filter;
        var f = typeof data == "string" ? ko.utils.parseJson(data) : data;
        for (var i in (invert ? filter : f)) {
            if (typeof filter[i] == "function") {
                filter[i](f[i]);
            } else if (typeof f[i] == "object") {
                koModel.filter.parse(filter[i], f[i], true);
            } else {
                filter[i] = f[i];
            }
        }
    };

    koModel.confirmFilter = function () {
        div.dialog("close");
        var data = koModel.filter.getData();
        var f = koModel.reportFilter();
        if (!f) {
            f = model.reportFilters.create().toKo();
            koModel.reportFilter(f);
            f.name(koModel.filter.name() || "Новый фильтр");
        }
        f.name(koModel.filter.name() || "Новый фильтр");
        f.reportID(koModel.reportID);
        f.userID(host.uid);
        f.data(data);
        koModel.updateAll();
    };

    koModel.saveFilter = function () {
        if (koModel.reportFilter()) {
            koModel.confirmFilter();
        } else {
            div.dialog("open");
        }
    };

    koModel.cancelFilter = function () {
        div.dialog("close");
    };

    koModel.removeFilter = function (row) {
        ejs.confirm("Удаление", "Вы точно хотите удалить фильтр " + row.name() + "?", function () {
            row.entity.remove();
            koModel.updateAll();
        });
    };

    koModel.showFilters = function () {
        divFilters.dialog("open");
    };

    koModel.setFilter = function (row) {
        koModel.reportFilter(row);
        koModel.filter.parse(koModel.filter, row.data());
        divFilters.dialog("close");
        koModel.refresh();
    };

    koModel.clearFilter = function () {
        koModel.filter.clear();
        koModel.reportFilter("");
    };

    div.dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        width: 500,
        height: 200,
        open: function () {

        }
    });

    divFilters.dialog({
        autoOpen: false,
        modal: true,
        resizable: true,
        width: 500,
        open: function () {

        }
    });
};