var paymentsDialogKoModel = {
    contractorID: ko.obs(""),
    projectID: ko.obs(""),
    data: ko.obs(null),
    title: ko.obs("")
};

function initPaymentsDialog() {
    var div = $("#divPaymentsDialog");
    var context = paymentsDialogKoModel;
    if (koModel && !koModel.paymentsDialogKoModel) {
        koModel.paymentsDialogKoModel = context;
    }

    context.show = function (title) {
        
        top.busy("PaymentsLoading");
        $.rjson({
            url: ApplicationRootPath + "AllReports/PaymentsJson",
            data: { ID: context.contractorID(), ProjectID: context.projectID() },
            success: function (result) {
                top.free("PaymentsLoading");
                result = toJsObject(result);
                context.data(result);
                if (title) {
                    context.title(title);
                }
                else {
                    context.title("Субподрядчик -- " + result.contractor.name);
                }
                div.dialog("open");
            },
            error: function () {
                top.free("PaymentsLoading");
                alert("Произошла непредвиденная ошибка :(");
            }
        });
    };

    context.toExcel = function () {
        var data = context.data();
        var rows = [];
        var headers = [];
        var name = ["Платежи_субподрядчику_", data.contractor.name, "_", (new Date()).toSds()].join("").replace(/\./g, "-");
        var meta = [{ Name: "row", ID: 1, Settings: ["FontWeight", "bold"] }, { Name: "row", ID: 2, Settings: ["FontWeight", "bold"] }, { Name: "range", ID: "1,1,1,3", Settings: ["Merge", "true"] }];
        rows.push(["Субподрядчик -- " + data.contractor.name]);
        rows.push(["Проект", "Дата", "Сумма"]);

        data.payments.forEach(function (it) {
            rows.push([it.project, it.date, it.sum]);
        });

        rows.push(["", "Сумма платежей:", data.payed]);
        rows.push(["", "Остатки к оплате:", data.debt]);

        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows, Meta: meta }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    div.dialog({
        title: context.title(),
        width: 600,
        modal: false,
        autoOpen: false,
        resizable: true,
        buttons: [{ text: 'В Excel', click: function () { context.toExcel(); } }, { text: 'Закрыть', click: function () { div.dialog("close"); } }],
        open: function () { div.dialog({ title: context.title() }); }
    });

    ko.apply(context, div.get(0));
}

$(initPaymentsDialog);