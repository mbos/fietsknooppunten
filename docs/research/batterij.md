# Batterijgebruik van de horloge-app

Aanleiding: de app controleert elke seconde de GPS-status en tekent dan het scherm opnieuw (ticket 03). Hoeveel kost dat, en wat valt er te winnen?

## Waar de stroom heen gaat

De grootste verbruikers op een horloge zijn de GNSS-ontvanger en het scherm. Ons eigen rekenwerk is daarbij klein. Garmin publiceert geen verbruikscijfers per API-aanroep, dus het onderstaande is gebaseerd op de documentatie en op de handleiding van de fr970.

| Verbruiker | Wat de app nu doet | Invloed |
|---|---|---|
| GNSS-ontvanger | `enableLocationEvents(LOCATION_CONTINUOUS)` zonder opties, plus de opname-sessie | **groot** |
| Scherm (AMOLED) | elke seconde opnieuw tekenen; zwarte achtergrond; een grijze ring die altijd brandt | middel |
| CPU | timer van 1 Hz, `Position.getInfo()`, tekenen | klein |

## Bevindingen

1. **De GNSS-modus is de grootste knop.**
   - **Verschil op de fr970:** volgens de handleiding houdt de fr970 het 26 uur vol met alleen GPS, en 21 uur met All Systems plus multi-band ([Battery Life](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-1933DAC3-8171-4995-A1F0-CD298E1F5A33.html), zie ook `technologie.md` sectie G).
   - **Wat de app nu doet:** hij geeft geen opties mee. De documentatie zegt alleen dat zonder `:constellations` GPS wordt gebruikt. Wat het standaardgedrag is op een toestel met Dynamic SatIQ, staat er niet.
   - **SatIQ-standen (API 6.0.1):** sinds deze API-versie kun je een SatIQ-stand kiezen ([Position](https://developer.garmin.com/connect-iq/api-docs/Toybox/Position.html)):
     - `CONFIGURATION_SAT_IQ_NORMAL`: "balance between accuracy and battery life"
     - `CONFIGURATION_SAT_IQ_EXTENDED_BATTERY`: "longer battery life with good accuracy"
     - `CONFIGURATION_SAT_IQ_MAX_BATTERY`: "longest battery life, but lower accuracy"
   - **Ondersteuning op de fr970:** de fr970 heeft Connect IQ 6.0.3 (device-bestand in de SDK), dus deze standen zijn beschikbaar. Vaste standen zoals `CONFIGURATION_GPS` worden op toestellen met Dynamic SatIQ niet ondersteund; controleer dat met `Position.hasConfigurationSupport`.
   - **Benodigde nauwkeurigheid:** voor knooppunten herkennen binnen ongeveer 25 m is "good accuracy" ruim genoeg.
   - **Niet gedocumenteerd:** of de opname-sessie de GNSS-stand van de app overneemt, of de stand gebruikt die op het horloge is ingesteld. Dat moeten we op het horloge meten.

2. **Elke seconde `Position.getInfo()` is goedkoop, maar elke seconde tekenen is onnodig.**
   - `getInfo()` is volgens de documentatie bedoeld om "on demand or periodically within a Timer" te worden aangeroepen. De GPS staat toch al aan voor de opname, dus de aanroep zet niets extra aan.
   - Wat wel elke seconde gebeurt: het hele scherm opnieuw tekenen (`requestUpdate`). Dat gebeurt alleen omdat de rijtijd in seconden loopt. Op de knooppunt, de afstand (in tienden van een km) en de GPS-status hoeven we niet elke seconde te verversen.

3. **Het scherm gaat sowieso uit.** Een Connect IQ-app kan het AMOLED-scherm niet aan houden.
   - Gebruikers op het forum melden dat het scherm na de systeemtime-out (ongeveer 15 s) dimt of uitgaat. `Attention.backlight` werkt maar kort; bij te lang gebruik volgt een `BacklightOnTooLongException` ([forum](https://forums.garmin.com/developer/connect-iq/f/discussion/388193/amoled-backlight-timing-and-burn-in-protection-rules-for-ciq-apps), geen officiële bron).
   - Dat is goed voor de batterij. Voor ticket 07 betekent het wel: bij aankomst bij een knooppunt kort trillen en het scherm even aanzetten, niet het scherm continu aan houden.

4. **Of `onUpdate` wordt aangeroepen terwijl het scherm uit is, is niet gedocumenteerd.** De View-documentatie noemt een lagere update-frequentie alleen voor watch faces ([View](https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/View.html)). We gaan er dus van uit dat onze timer gewoon doortekent als het scherm uit staat.

5. **Elk brandend pixel kost stroom op AMOLED** (forum, geen officiële bron). De zwarte achtergrond is goed. De grijze ring die altijd rondom het scherm staat, brandt continu en voegt weinig toe.

6. **De simulator stuurt geen positiemeldingen** bij een vaste positie: in een run met een ingestelde positie kwam er geen enkele `onPosition` binnen (eigen meting, 13-11-2026). Testen van GPS-gedrag (ticket 07) kan daarom alleen met het afspelen van een FIT-bestand, of op het horloge.

## Voorstel

Gerangschikt naar verwachte winst:

1. **GNSS-stand expliciet kiezen.**
   - Gebruik `CONFIGURATION_SAT_IQ_EXTENDED_BATTERY` als die ondersteund wordt (`hasConfigurationSupport`); anders `SAT_IQ`; en anders de standaard.
   - Eventueel later als instelling in de app: Normaal, Zuinig of Max. batterij.
2. **Alleen tekenen als er iets verandert.**
   - De rijtijd in uren en minuten tonen ("1:23"), niet in seconden.
   - De timer houdt een "schermsleutel" bij (rijtijd in minuten, afstand in tienden van een km, GPS ja/nee, pauze ja/nee) en vraagt alleen een nieuwe tekening aan als die sleutel verandert.
   - Daarmee gaan we van 3600 naar ongeveer 60 tot 200 tekenbeurten per uur.
3. **De GPS-status minder vaak controleren**: elke 5 s is genoeg.
4. **De grijze achtergrondring weghalen**; alleen de groene voortgangsboog tekenen.
5. **Meten op het horloge**: twee ritten van een uur, voor en na de wijzigingen. Noteer telkens het batterijpercentage aan begin en eind. Op die manier krijgen we echte cijfers in plaats van aannames.

## Open vragen

- Neemt de opname-sessie de GNSS-stand van `enableLocationEvents` over, of die van de systeeminstelling?
- Wordt `onUpdate` uitgevoerd terwijl het scherm uit staat?
- Wat kost `Position.getInfo()` precies? Het is vrijwel zeker verwaarloosbaar, maar dat is niet gedocumenteerd.

## Doorgevoerd (13-11-2026)

- **GNSS-stand:** de app kiest `SAT_IQ_EXTENDED_BATTERY`, of anders `SAT_IQ`, of anders `GPS`. De gekozen stand komt in het log.
  - In de simulator wordt dat `255` (`SAT_IQ`): de simulator ondersteunt `EXTENDED_BATTERY` dus niet, of rapporteert het niet.
  - Op het horloge kun je het nakijken in het logbestand van de app. Maak daarvoor het lege bestand `GARMIN/APPS/LOGS/KNOOPPUNTEN.TXT` aan (de naam moet gelijk zijn aan de `.prg`); `System.println` schrijft daar dan naartoe.
- **Statustijd:** de rijtijd staat in uren en minuten. Elke 5 s wordt de statusregel vergeleken met wat er op het scherm staat, en alleen bij een verschil wordt er opnieuw getekend.
- **Positiemeldingen:** een `onPosition` vraagt geen nieuwe tekening meer aan.
- **Achtergrondring:** de grijze ring is weg.
