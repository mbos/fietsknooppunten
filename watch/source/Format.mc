import Toybox.Lang;

//! Weergave van afstanden in Nederlandse notatie.
module Format {
    //! Afstand tot een knooppunt, afgerond zodat het getal niet bij elke meter verspringt
    //! (minder vaak opnieuw tekenen): onder 200 m per 10 m, onder 1 km per 50 m,
    //! daarboven per 100 m. 47 -> "50 m", 860 -> "850 m", 12345 -> "12,3 km".
    function distance(meters as Double) as String {
        var m = meters.toNumber();
        if (m < 195) {
            return (((m + 5) / 10) * 10).toString() + " m";
        }
        var rounded = ((m + 25) / 50) * 50;
        if (rounded < 1000) {
            return rounded.toString() + " m";
        }
        var tenths = (m + 50) / 100;
        return (tenths / 10).toString() + "," + (tenths % 10).toString() + " km";
    }
}
