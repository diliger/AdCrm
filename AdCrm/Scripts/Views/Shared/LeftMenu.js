$(function () {
    if (!z.userSettings().leftMenu) {
        var s = z.userSettings();

        s.leftMenu = {};
        z.userSettings(s);
    }

    window.setLeftMenuHeight = function () {
        var h = parseInt($(window).height());
        var count = $("div.left-menu h3").size();
        var static = $("div.static");
        var rc = $("#divRightContent");
        var divMenu = $("div.item.selected div:first");
        h = h - (count * 25 + 210);
        h = h < divMenu.find("ul").height() + 15 ? divMenu.find("ul").height() + 15 : h;
        divMenu.css("height", h + "px");
        $(".left-menu-button").height(h);

        if (static.size() > 0) {
            static = static.outerHeight();
        } else {
            static = 0;
        }

        $(".container.scroll").each(function () {
            var header = $(this).offset().top - rc.offset().top;
            $(this).css("height", $("div.left-menu").height() - header - 10 + "px");
        });
        $(".container .scroll.kogrid,.container.ejsgrid").each(function () {
            var header = $(this).offset().top - rc.offset().top;
            $(this).css("height", $("div.left-menu").height() - header + "px");
        });
    };

    setLeftMenuHeight();
    $(window).resize(function () {
        setLeftMenuHeight();
    });

    var h = $("div.left-menu h3.selected");

    $("div.left-menu").prepend(h);

    $("div.left-menu-button").click(function () {
        var div = $(this);
        var is = div.data("collapsed") ? true : false;

        if (!is) {
            $("#divAccordion").fadeOut(200);
            setTimeout(function () {
                $("#divRightContent").animate({ marginLeft: 0 }, "fast");
            }, 200);
            div.data("collapsed", true);

            var s = z.userSettings();
            s.leftMenu.hidden = true;
            z.userSettings(s);
        } else {
            $("#divRightContent").animate({ marginLeft: 230 }, "fast");
            setTimeout(function () {
                $("#divAccordion").fadeIn(200);
            }, 200);
            div.data("collapsed", false);

            var s = z.userSettings();
            s.leftMenu.hidden = false;
            z.userSettings(s);
        }

        div.toggleClass("collapsed");
    });

    var s = z.userSettings();
    var div = $("div.left-menu-button");

    if (s.leftMenu.hidden) {
        $("#divAccordion").hide();
        $("#divRightContent").css({ marginLeft: 0 });
        div.toggleClass("collapsed");
        div.data("collapsed", true);
    }
});