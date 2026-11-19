import React from 'react';
import {
    GROUP_TYPES, BUDGET_PARTS, DINING_STYLES, LODGING_TYPES, AREA_VIBES, TRANSPORT_MODES,
    LANGUAGE_COMFORT, WEATHER, WALKING, SCALES, INTERESTS, INTEREST_WEIGHTS, OCCASIONS,
} from '../../../shared/tripPreferences.js';
import {
    Choices, MultiAnswer, CountryAnswer, CityAnswer, DatesAnswer, HotelAnswer, AddressAnswer,
    FlightsAnswer, BudgetAnswer, SplurgeSaveAnswer, InterestsAnswer, ComboAnswer,
} from './ChatAnswers';
import { formatTime } from '../TimeSelect';

// The chat questionnaire's script: the same questions as the old step-by-step form, in the
// same order, asked one at a time. Each question has a `key` (unique, per city where needed),
// the `group` it belongs to (the old step ids, which the review's Edit buttons use), the
// assistant's message, and `render(ctx)` for the answer controls. A question is asked when it
// hasn't been answered yet and its `when` (if any) holds.
//
// ctx: { f (form data), update, patchCity, setPref, skipPref, answer(text), forget(predicate), needs }

export const GROUP_TITLES = {
    where: 'Where & when',
    flights: 'Flights',
    stay: "Where you'll stay",
    group: "Who's going & budget",
    style: 'Pace & style',
    interests: 'Interests & food',
    around: 'Getting around & extras',
    review: 'Review',
};

export const TRAVEL_STYLES = [
    ['early_bird', 'Early bird', 'Start early, relax evenings'],
    ['night_owl', 'Night owl', 'Slow mornings, active nights'],
    ['flexible', 'Flexible', 'A mix of both'],
];
export const VACATION_TYPES = [
    ['relaxation', 'Relaxation', 'Slow pace, unwind'],
    ['adventure', 'Adventure', 'Explore everything'],
    ['constant', 'Constantly moving', 'Packed schedule'],
    ['balanced', 'Balanced', 'Relaxing and exploring'],
];

const detailed = (f) => f.preferences.planDetail === 'detailed';
const label = (list, id) => list.find(([k]) => k === id)?.[1] ?? id;
const fmtDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const indexOf = (key) => Number(key.match(/-(\d+)$/)?.[1]);
const perCity = /^(city-name|city-dates|more-cities|stay|hotel|address)-\d+$/;

const YES_NO = [['yes', 'Yes'], ['no', 'No']];

// A 1–5 scale as three taps: one end, in between, the other end
const scaleOptions = (key) => {
    const [low, high] = SCALES[key];
    return [[1, low], [3, 'Somewhere in between'], [5, high]];
};
const scaleText = (key, v) => label(scaleOptions(key), v);

// The saved answer to an optional question, or null if it was skipped
const ans = (f, key) => (f.preferences[key] && !f.preferences[key].noPreference ? f.preferences[key].value : null);

// Saves a combined card's answers: a value is an answer, null is "No preference". `flags` are
// the yes/no extras (plain booleans).
const savePrefs = (ctx, values, flags = {}) => {
    ctx.update({
        preferences: {
            ...ctx.f.preferences,
            ...Object.fromEntries(
                Object.entries(values).map(([key, value]) => [
                    key,
                    value == null ? { ...ctx.f.preferences[key], noPreference: true } : { value, noPreference: false },
                ])
            ),
            ...flags,
        },
    });
};

// "Couple · 2 adults · with a pet", or "No preference" when nothing was answered
const summary = (parts) => {
    const text = parts.filter(Boolean).join(' · ');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'No preference';
};

const travelersText = (t) =>
    Object.entries(t).filter(([, n]) => n).map(([k, n]) => `${n} ${n === 1 ? k.replace(/s$/, '') : k}`).join(', ');

const listText = (options, ids) => ids.map((id) => label(options, id)).join(', ');

export function buildQuestions(f) {
    const q = [];
    const add = (question) => q.push(question);

    // ---- Where & when ----
    add({
        key: 'plan',
        group: 'where',
        bot: () => "Hi! I'm your TriptAi travel assistant ✈️ Let's plan your trip together. First, how much should I tailor it?",
        render: (ctx) => (
            <Choices
                label="Plan detail"
                options={[['quick', 'Quick plan: just the essentials'], ['detailed', 'Detailed plan: budget, interests, food and more']]}
                onPick={(id) => { ctx.update({ preferences: { ...ctx.f.preferences, planDetail: id } }); ctx.answer(id === 'quick' ? 'Quick plan' : 'Detailed plan'); }}
            />
        ),
    });
    add({
        key: 'country',
        group: 'where',
        bot: () => 'Where are you headed? 🌍',
        render: (ctx) => (
            <CountryAnswer
                initial={ctx.f.country}
                onSend={(country) => {
                    if (country !== ctx.f.country) {
                        // New destination: its cities and stays need asking again
                        ctx.update({ country, cities: ctx.f.cities.map((c) => ({ ...c, name: '', homebaseType: null, hotel: { name: '', address: '' }, customAddress: '', hotelAddressStatus: 'idle', customAddressStatus: 'idle' })) });
                        ctx.forget((k) => /^(city-name|stay|hotel|address)-\d+$/.test(k));
                    }
                    ctx.answer(country);
                }}
            />
        ),
    });

    f.cities.forEach((city, i) => {
        add({
            key: `city-name-${i}`,
            group: 'where',
            bot: () => (i === 0 ? `${f.country}, great choice! Which city are you starting in?` : 'Which city is next?'),
            render: (ctx) => (
                <CityAnswer country={ctx.f.country} initial={city.name} onSend={(name) => { ctx.patchCity(i, { name }); ctx.answer(name); }} />
            ),
        });
        add({
            key: `city-dates-${i}`,
            group: 'where',
            bot: () => `When will you be in ${city.name}? 📅`,
            render: (ctx) => (
                <DatesAnswer
                    cities={ctx.f.cities}
                    index={i}
                    onSend={(dates) => { ctx.patchCity(i, dates); ctx.answer(`${fmtDate(dates.checkIn)} to ${fmtDate(dates.checkOut)}`); }}
                />
            ),
        });
        add({
            key: `more-cities-${i}`,
            group: 'where',
            bot: () => 'Are you visiting any other cities on this trip?',
            render: (ctx) => (
                <Choices
                    label="More cities"
                    options={[['more', 'Add another city'], ['done', "No, that's all"]]}
                    onPick={(id, text) => {
                        if (id === 'more') {
                            if (!ctx.f.cities[i + 1]) {
                                ctx.update({
                                    cities: [...ctx.f.cities, { name: '', checkIn: '', checkOut: '', homebaseType: null, hotel: { name: '', address: '' }, customAddress: '', hotelAddressStatus: 'idle', customAddressStatus: 'idle' }],
                                });
                            }
                        } else {
                            // Drop any cities after this one, and what was asked about them
                            ctx.update({ cities: ctx.f.cities.slice(0, i + 1) });
                            ctx.forget((k) => perCity.test(k) && indexOf(k) > i);
                        }
                        ctx.answer(text);
                    }}
                />
            ),
        });
    });

    add({
        key: 'timing',
        group: 'where',
        when: detailed,
        bot: () => "A few quick details about your travel days, so day 1 isn't overpacked:",
        render: (ctx) => (
            <ComboAnswer
                label="Travel days"
                parts={[
                    { id: 'arrivalTime', label: 'Arrival time on day 1', kind: 'time', initial: ans(ctx.f, 'arrivalTime') },
                    { id: 'departureTime', label: 'Departure time on the last day', kind: 'time', initial: ans(ctx.f, 'departureTime') },
                    { id: 'homeAirport', label: 'Coming from', kind: 'text', maxLength: 100, placeholder: 'Home city or airport, e.g. Orlando (MCO)', initial: ans(ctx.f, 'homeAirport') },
                ]}
                onDone={(v) => {
                    savePrefs(ctx, v);
                    ctx.answer(summary([v.arrivalTime && `Arrive ${formatTime(v.arrivalTime)}`, v.departureTime && `leave ${formatTime(v.departureTime)}`, v.homeAirport && `from ${v.homeAirport}`]));
                }}
            />
        ),
    });

    // ---- Flights ----
    add({
        key: 'flights',
        group: 'flights',
        bot: () => "Do you have your flights booked? ✈️ Add them here to keep them with your trip, or skip and add them later from the Reservations tab.",
        render: (ctx) => (
            <FlightsAnswer
                initial={ctx.f.reservations?.flights || []}
                onDone={(flights) => {
                    ctx.update({ reservations: { hotels: [], ...ctx.f.reservations, flights } });
                    ctx.answer(flights.length ? `${flights.length} flight${flights.length === 1 ? '' : 's'} added` : 'Not yet');
                }}
            />
        ),
    });

    // ---- Where you'll stay ----
    f.cities.forEach((city, i) => {
        add({
            key: `stay-${i}`,
            group: 'stay',
            bot: () => `Where are you staying in ${city.name}? 🏨 I'll plan each day's route around it.`,
            render: (ctx) => (
                <Choices
                    label="Where you're staying"
                    options={[['hotel', 'A hotel'], ['custom', 'Another address'], ['skip', 'Not booked yet']]}
                    onPick={(id, text) => {
                        ctx.patchCity(i, { homebaseType: id });
                        ctx.forget((k) => k === `hotel-${i}` || k === `address-${i}`);
                        ctx.answer(text);
                    }}
                />
            ),
        });
        add({
            key: `hotel-${i}`,
            group: 'stay',
            when: () => city.homebaseType === 'hotel',
            bot: () => 'Which hotel?',
            render: (ctx) => (
                <HotelAnswer city={city} country={ctx.f.country} onSend={(patch) => { ctx.patchCity(i, patch); ctx.answer(patch.hotel.name); }} />
            ),
        });
        add({
            key: `address-${i}`,
            group: 'stay',
            when: () => city.homebaseType === 'custom',
            bot: () => "What's the address?",
            render: (ctx) => (
                <AddressAnswer initial={city.customAddress} onSend={(patch) => { ctx.patchCity(i, patch); ctx.answer(patch.customAddress); }} />
            ),
        });
    });
    const anySkipped = (x) => detailed(x) && x.cities.some((c) => c.homebaseType === 'skip');
    add({
        key: 'lodging',
        group: 'stay',
        when: anySkipped,
        bot: () => "Since you haven't booked everywhere yet, what are you looking for?",
        render: (ctx) => (
            <ComboAnswer
                label="Lodging"
                parts={[
                    { id: 'lodgingType', label: 'Kind of place', kind: 'single', options: LODGING_TYPES, initial: ans(ctx.f, 'lodgingType') },
                    { id: 'areaVibe', label: 'Area', kind: 'single', options: AREA_VIBES, initial: ans(ctx.f, 'areaVibe') },
                ]}
                onDone={(v) => {
                    savePrefs(ctx, v);
                    ctx.answer(summary([v.lodgingType && label(LODGING_TYPES, v.lodgingType), v.areaVibe && `${label(AREA_VIBES, v.areaVibe).toLowerCase()} area`]));
                }}
            />
        ),
    });

    // ---- Who's going & budget ----
    add({
        key: 'who',
        group: 'group',
        when: detailed,
        bot: () => "Who's coming along? 👯",
        render: (ctx) => (
            <ComboAnswer
                label="Who's going"
                parts={[
                    { id: 'groupType', label: "Who's going?", kind: 'single', options: GROUP_TYPES, initial: ans(ctx.f, 'groupType') },
                    { id: 'travelers', label: 'How many travelers?', kind: 'travelers', initial: ans(ctx.f, 'travelers') },
                    { id: 'pets', label: 'Bringing a pet? 🐾', kind: 'single', options: YES_NO, initial: ctx.f.preferences.pets ? 'yes' : null },
                ]}
                onDone={(v) => {
                    const { pets, ...rest } = v;
                    savePrefs(ctx, rest, { pets: pets === 'yes' });
                    ctx.answer(summary([
                        v.groupType && label(GROUP_TYPES, v.groupType),
                        v.travelers && travelersText(v.travelers),
                        pets === 'yes' && 'with a pet',
                    ]));
                }}
            />
        ),
    });
    add({
        key: 'budget',
        group: 'group',
        when: detailed,
        bot: () => "What's your budget? A rough range is plenty 💸",
        render: (ctx) => (
            <BudgetAnswer
                initial={ctx.f.preferences.budget.value}
                initialCovers={ans(ctx.f, 'budgetCovers') || []}
                onDone={(v, covers) => {
                    ctx.setPref('budget', v);
                    if (covers.length) ctx.setPref('budgetCovers', covers);
                    else ctx.skipPref('budgetCovers');
                    const range = v.min !== '' && v.max !== '' ? `${v.min}–${v.max}` : v.min !== '' ? `From ${v.min}` : `Up to ${v.max}`;
                    ctx.answer(summary([`${range} ${v.currency} ${v.per === 'day' ? 'per day' : 'total'}`, covers.length && `covers ${listText(BUDGET_PARTS, covers).toLowerCase()}`]));
                }}
                onSkip={() => { ctx.skipPref('budget'); ctx.skipPref('budgetCovers'); ctx.answer('No preference'); }}
            />
        ),
    });
    add({
        key: 'splurgeSave',
        group: 'group',
        when: detailed,
        bot: () => 'Anything you want to splurge or save on?',
        render: (ctx) => (
            <SplurgeSaveAnswer
                initial={ctx.f.preferences.splurgeSave.value}
                onDone={(v) => {
                    ctx.setPref('splurgeSave', v);
                    ctx.answer(summary([v.splurge.length && `Splurge on ${listText(BUDGET_PARTS, v.splurge).toLowerCase()}`, v.save.length && `save on ${listText(BUDGET_PARTS, v.save).toLowerCase()}`]));
                }}
                onSkip={() => { ctx.skipPref('splurgeSave'); ctx.answer('No preference'); }}
            />
        ),
    });

    // ---- Pace & style ----
    add({
        key: 'style',
        group: 'style',
        bot: () => "Let's get your pace right. What's your travel style?",
        render: (ctx) => (
            <ComboAnswer
                label="Travel style"
                parts={[
                    { id: 'travelStyle', label: 'Your travel style', kind: 'single', required: true, options: TRAVEL_STYLES.map(([id, t]) => [id, t]), initial: ctx.f.travelStyle || null },
                    { id: 'vacationType', label: 'Kind of vacation', kind: 'single', required: true, options: VACATION_TYPES.map(([id, t]) => [id, t]), initial: ctx.f.vacationType || null },
                    ...(detailed(ctx.f)
                        ? [
                            { id: 'structure', label: 'How planned should each day be?', kind: 'single', options: scaleOptions('structure'), initial: ans(ctx.f, 'structure') },
                            { id: 'openAfternoons', label: 'Leave some afternoons open for whatever you find?', kind: 'single', options: YES_NO, initial: ctx.f.preferences.openAfternoons ? 'yes' : null },
                        ]
                        : []),
                ]}
                onDone={(v) => {
                    const { travelStyle, vacationType, openAfternoons, ...rest } = v;
                    ctx.update({ travelStyle, vacationType });
                    if (detailed(ctx.f)) savePrefs(ctx, rest, { openAfternoons: openAfternoons === 'yes' });
                    ctx.answer(summary([
                        label(TRAVEL_STYLES, travelStyle),
                        label(VACATION_TYPES, vacationType),
                        v.structure && scaleText('structure', v.structure),
                        openAfternoons === 'yes' && 'some open afternoons',
                    ]));
                }}
            />
        ),
    });

    // ---- Interests & food ----
    add({
        key: 'interests',
        group: 'interests',
        when: detailed,
        bot: () => 'Now the fun part! What are you into? 🎉',
        render: (ctx) => (
            <InterestsAnswer
                initial={ctx.f.preferences.interests.value}
                onDone={(v) => {
                    ctx.setPref('interests', v);
                    ctx.answer(Object.entries(v).sort((x, y) => y[1] - x[1]).map(([k, w]) => `${label(INTERESTS, k)} (${label(INTEREST_WEIGHTS, w).toLowerCase()})`).join(', '));
                }}
                onSkip={() => { ctx.skipPref('interests'); ctx.answer('Surprise me'); }}
            />
        ),
    });
    add({
        key: 'sights',
        group: 'interests',
        when: detailed,
        bot: () => 'What kind of sightseeing are you after?',
        render: (ctx) => (
            <ComboAnswer
                label="Sightseeing"
                parts={[
                    { id: 'touristy', label: 'Famous sights or hidden gems?', kind: 'single', options: scaleOptions('touristy'), initial: ans(ctx.f, 'touristy') },
                    { id: 'mustDo', label: 'Anything you must do?', kind: 'text', multiline: true, placeholder: 'e.g. sunrise at Fushimi Inari, a sumo match', initial: ans(ctx.f, 'mustDo') },
                    { id: 'avoid', label: 'Anything to avoid?', kind: 'text', multiline: true, placeholder: 'e.g. "no museums", "hate crowds"', initial: ans(ctx.f, 'avoid') },
                ]}
                onDone={(v) => {
                    savePrefs(ctx, v);
                    ctx.answer(summary([v.touristy && scaleText('touristy', v.touristy), v.mustDo && `must do: ${v.mustDo}`, v.avoid && `avoid: ${v.avoid}`]));
                }}
            />
        ),
    });
    add({
        key: 'food',
        group: 'interests',
        when: detailed,
        bot: (x, needs) =>
            `Let's talk food 🍜${needs.dietary.length ? ` I'll keep your dietary needs from your profile in mind (${needs.dietary.join(', ')}).` : ''}`,
        render: (ctx) => (
            <ComboAnswer
                label="Food"
                parts={[
                    { id: 'diningStyle', label: 'How do you like to eat?', kind: 'single', options: DINING_STYLES, initial: ans(ctx.f, 'diningStyle') },
                    { id: 'foodAdventure', label: 'How adventurous are you with food?', kind: 'single', options: scaleOptions('foodAdventure'), initial: ans(ctx.f, 'foodAdventure') },
                    { id: 'foodExperiences', label: 'Want a food tour or cooking class?', kind: 'single', options: YES_NO, initial: ctx.f.preferences.foodExperiences ? 'yes' : null },
                ]}
                onDone={(v) => {
                    const { foodExperiences, ...rest } = v;
                    savePrefs(ctx, rest, { foodExperiences: foodExperiences === 'yes' });
                    ctx.answer(summary([
                        v.diningStyle && label(DINING_STYLES, v.diningStyle),
                        v.foodAdventure && scaleText('foodAdventure', v.foodAdventure),
                        foodExperiences === 'yes' && 'a food tour or cooking class',
                    ]));
                }}
            />
        ),
    });

    // ---- Getting around & extras ----
    add({
        key: 'gettingAround',
        group: 'around',
        when: detailed,
        bot: (x, needs) =>
            `Almost done! ${needs.mobility.length ? `I'll plan around the accessibility needs on your profile (${needs.mobility.join(', ')}). ` : ''}How do you like to get around? 🚇`,
        render: (ctx) => (
            <ComboAnswer
                label="Getting around"
                parts={[
                    { id: 'transport', label: 'Getting around', kind: 'multi', options: TRANSPORT_MODES, initial: ans(ctx.f, 'transport') },
                    { id: 'maxWalking', label: 'Comfortable walking per day', kind: 'single', options: WALKING, initial: ans(ctx.f, 'maxWalking') },
                    { id: 'dayTrips', label: 'Day trips outside the cities?', kind: 'single', options: [['yes', 'Yes, happy to'], ['no', 'No, stay in the cities']], initial: ans(ctx.f, 'dayTrips') == null ? null : ans(ctx.f, 'dayTrips') ? 'yes' : 'no' },
                ]}
                onDone={(v) => {
                    savePrefs(ctx, { ...v, dayTrips: v.dayTrips == null ? null : v.dayTrips === 'yes' });
                    ctx.answer(summary([
                        v.transport && listText(TRANSPORT_MODES, v.transport),
                        v.maxWalking && `walk ${label(WALKING, v.maxWalking)}`,
                        v.dayTrips && (v.dayTrips === 'yes' ? 'day trips welcome' : 'no day trips'),
                    ]));
                }}
            />
        ),
    });
    add({
        key: 'extras',
        group: 'around',
        when: detailed,
        bot: () => 'A few extras to make it feel like your trip:',
        render: (ctx) => {
            const occasion = ans(ctx.f, 'occasion');
            return (
                <ComboAnswer
                    label="Extras"
                    parts={[
                        { id: 'occasionType', label: 'A special occasion? 🎂', kind: 'single', options: OCCASIONS, initial: occasion?.type ?? null },
                        { id: 'occasionNote', label: 'Anything we should know about it?', kind: 'text', maxLength: 200, placeholder: 'e.g. Sam turns 30 on day 3', initial: occasion?.note || null },
                        { id: 'language', label: 'Language', kind: 'single', options: LANGUAGE_COMFORT, initial: ans(ctx.f, 'language') },
                        { id: 'weather', label: "Weather you're fine with", kind: 'multi', options: WEATHER, initial: ans(ctx.f, 'weather') },
                    ]}
                    onDone={(v) => {
                        const { occasionType, occasionNote, ...rest } = v;
                        savePrefs(ctx, { ...rest, occasion: occasionType || occasionNote ? { type: occasionType, note: occasionNote || '' } : null });
                        ctx.answer(summary([
                            occasionType && label(OCCASIONS, occasionType),
                            occasionNote,
                            v.language && label(LANGUAGE_COMFORT, v.language),
                            v.weather && `fine with ${listText(WEATHER, v.weather).toLowerCase()}`,
                        ]));
                    }}
                />
            );
        },
    });
    const OUTPUT = [['costs', 'Estimated costs'], ['bookingLinks', 'Booking links'], ['rainyDay', 'Rainy-day backups']];
    add({
        key: 'output',
        group: 'around',
        when: detailed,
        bot: () => 'Last one! Want me to add any of these to your itinerary?',
        render: (ctx) => (
            <MultiAnswer
                label="Add to my itinerary"
                options={OUTPUT}
                initial={Object.entries(ctx.f.preferences.output).filter(([, on]) => on).map(([k]) => k)}
                onDone={(v) => { ctx.update({ preferences: { ...ctx.f.preferences, output: Object.fromEntries(OUTPUT.map(([k]) => [k, v.includes(k)])) } }); ctx.answer(listText(OUTPUT, v)); }}
                onSkip={() => { ctx.update({ preferences: { ...ctx.f.preferences, output: { costs: false, bookingLinks: false, rainyDay: false } } }); ctx.answer('None of these'); }}
                skipLabel="None of these"
            />
        ),
    });

    add({ key: 'review', group: 'review' });
    return q.filter((question) => !question.when || question.when(f));
}
