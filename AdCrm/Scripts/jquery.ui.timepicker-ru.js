/* Deutsch initialisation for the timepicker plugin */
/* Written by Bernd Plagge (bplagge@choicenet.ne.jp). */
jQuery(function($){
    $.timepicker.regional['ru'] = {
                hourText: 'Часы',
                minuteText: 'Минуты',
                amPmText: ['AM', 'PM'] }
    $.timepicker.setDefaults($.timepicker.regional['ru']);
});