import csv
import os

data = [
    # FOOD
    ("I have two children and we have not had food since yesterday.", "FOOD"),
    ("We are starving and have nothing to eat tonight.", "FOOD"),
    ("Need urgent food rations for a family of four.", "FOOD"),
    ("Looking for a community kitchen or free meals for homeless individuals.", "FOOD"),
    ("My baby needs milk formula and we have run out of money.", "FOOD"),
    ("Elderly person living alone with no groceries or cooked meals.", "FOOD"),
    ("Need dry rations like rice, wheat flour, and lentils for our shelter.", "FOOD"),
    ("Is there any food bank nearby giving emergency food packets?", "FOOD"),
    ("We haven't eaten properly for two days, please help us with dinner.", "FOOD"),
    ("Urgent requirement of baby food and drinking water for flood victims.", "FOOD"),
    ("Looking for leftover cooked food for hungry daily wage workers.", "FOOD"),
    ("Need breakfast and lunch supplies for children in slum area.", "FOOD"),
    ("My family has skipped three meals consecutively due to poverty.", "FOOD"),
    ("Struggling to afford nutrition for pregnant mother, need dietary support.", "FOOD"),
    ("Requesting cooked meal delivery for an invalid senior citizen.", "FOOD"),
    ("Need daily evening meals for 15 homeless people at railway station.", "FOOD"),
    ("Running out of provisions and grocery stores are not giving credit.", "FOOD"),
    ("No bread or milk for my toddler this morning.", "FOOD"),
    ("Can someone donate packaged snacks and fruit for needy kids?", "FOOD"),
    ("Severe food scarcity in our temporary camp, 20 people hungry.", "FOOD"),
    ("Need grain packets and cooking oil to survive this week.", "FOOD"),
    ("Homeless man sleeping hungry near bus stand, needs a warm meal.", "FOOD"),
    ("We need nutritious food packets for malnourished infants.", "FOOD"),
    ("Our kitchen is empty, no rice or dal left at home.", "FOOD"),
    ("Requesting mid-day meals assistance for destitute widows.", "FOOD"),
    ("Need emergency relief food supply for stranded migrant workers.", "FOOD"),
    ("Hungry family of 5 urgently needing bread, milk, and canned food.", "FOOD"),
    ("Can any NGO provide daily free lunch boxes?", "FOOD"),
    ("Mother with newborn has no food or water tonight.", "FOOD"),
    ("Community members pooling for food distribution, need raw ingredients.", "FOOD"),

    # SHELTER
    ("We got evicted from our room and are sleeping on the street tonight.", "SHELTER"),
    ("Homeless family with small kids needs immediate overnight shelter.", "SHELTER"),
    ("Sleeping on railway platform, cold and unsafe, need place to stay.", "SHELTER"),
    ("Seeking emergency accommodation for woman fleeing domestic violence.", "SHELTER"),
    ("House roof collapsed due to rains, nowhere to sleep.", "SHELTER"),
    ("Elderly man abandoned by relatives, sitting outside in rain, needs old age home.", "SHELTER"),
    ("Need temporary housing or dorm bed for destitute youth.", "SHELTER"),
    ("Looking for a night shelter near the bus terminal.", "SHELTER"),
    ("Eviction notice served today, will be on the footpath by evening.", "SHELTER"),
    ("Displaced by slum demolition, 10 families sleeping in open ground.", "SHELTER"),
    ("Need transitional shelter for released prisoner with no family.", "SHELTER"),
    ("Rain leaking heavily through thatched hut, family needs dry accommodation.", "SHELTER"),
    ("Homeless veteran looking for safe bed and roof over head.", "SHELTER"),
    ("Unsafe living conditions on pavement, need secure shelter for girl child.", "SHELTER"),
    ("Seeking temporary shelter home for runaway teenager.", "SHELTER"),
    ("Looking for short-stay home for physically challenged person.", "SHELTER"),
    ("No roof tonight, temperature dropping, urgent shelter request.", "SHELTER"),
    ("Need safe refuge center for abandoned mother and child.", "SHELTER"),
    ("Temporary tent destroyed by strong winds, need emergency shelter.", "SHELTER"),
    ("Where can an unemployed destitute sleep safely tonight?", "SHELTER"),
    ("Seeking charity hostel or shelter bed for handicapped person.", "SHELTER"),
    ("Locked out by landlord, family of three standing on road with luggage.", "SHELTER"),
    ("Living under flyover bridge, need clean shelter and sanitation.", "SHELTER"),
    ("Destitute elderly woman needs admittance to care home or shelter.", "SHELTER"),
    ("Urgent shelter required for migrant laborers stranded without lodging.", "SHELTER"),

    # CLOTHING
    ("Need warm blankets and sweaters for shivering children this winter.", "CLOTHING"),
    ("Homeless man wears torn clothes, needs pants and shirt donations.", "CLOTHING"),
    ("Urgent requirement of raincoats and plastic sheets for monsoon.", "CLOTHING"),
    ("Looking for school uniform and shoes for poor students.", "CLOTHING"),
    ("Newborn baby has no clothes or wraps, mother in poverty.", "CLOTHING"),
    ("Need winter jackets, thermal wear, and socks for street dwellers.", "CLOTHING"),
    ("Requesting clean second-hand garments for women in temporary camp.", "CLOTHING"),
    ("Footwear needed, walking barefoot on hot asphalt.", "CLOTHING"),
    ("Need dress and shoes for young boy attending job interview.", "CLOTHING"),
    ("All clothes lost in house fire, family has only what they are wearing.", "CLOTHING"),
    ("Looking for bedsheets, blankets, and towels for destitute dormitory.", "CLOTHING"),
    ("Need warm shawls and woolen caps for elderly people sleeping outside.", "CLOTHING"),
    ("Children wearing rags, need casual clothes and slippers.", "CLOTHING"),
    ("Seeking baby clothes, diapers, and cotton swaddles.", "CLOTHING"),
    ("Clothes distribution drive needed for 30 homeless people at flyover.", "CLOTHING"),
    ("Need clean cotton sarees and nightgowns for elderly destitute women.", "CLOTHING"),
    ("No shoes or sandals, feet blistered from walking long distances.", "CLOTHING"),
    ("Please donate trousers, shirts, and sweaters of medium and large sizes.", "CLOTHING"),
    ("Baby shivering in cold night, needs warm woolens immediately.", "CLOTHING"),
    ("School kids need black shoes, socks, and navy blue uniform.", "CLOTHING"),

    # MEDICAL
    ("Father is diabetic and has run out of insulin, cannot afford medicine.", "MEDICAL"),
    ("Deep wound on leg infected and bleeding, needs dressing and antiseptic.", "MEDICAL"),
    ("Elderly grandmother having severe chest pain and breathlessness.", "MEDICAL"),
    ("Child suffering from high fever and vomiting, need pediatric doctor.", "MEDICAL"),
    ("Need dialysis assistance for kidney patient unable to pay hospital fees.", "MEDICAL"),
    ("Prescription medicines needed for hypertension and heart condition.", "MEDICAL"),
    ("Disabled boy needs wheelchair or crutches to move around.", "MEDICAL"),
    ("Street dog bite on arm, needs anti-rabies vaccination immediately.", "MEDICAL"),
    ("Blind person needs basic medical checkup and eye care support.", "MEDICAL"),
    ("Asthma patient gasping for air, needs inhaler and nebulizer support.", "MEDICAL"),
    ("Need free medical consultation and basic lab tests for slum residents.", "MEDICAL"),
    ("Pregnant lady experiencing labor pains, needs ambulance transport to hospital.", "MEDICAL"),
    ("Child has fractured arm after falling, needs orthopedic treatment and plaster.", "MEDICAL"),
    ("Need psychiatric medication and counseling for traumatized homeless person.", "MEDICAL"),
    ("Burn injury on hands, needs burn ointment and sterile bandages.", "MEDICAL"),
    ("Patient requires blood transfusion urgently, O positive donor needed.", "MEDICAL"),
    ("Tuberculosis patient needs nutritional supplements and DOTS treatment.", "MEDICAL"),
    ("Severe dental infection with swelling, need dentist charity care.", "MEDICAL"),
    ("Need hearing aid and audiologist assessment for elderly beggar.", "MEDICAL"),
    ("Cataract surgery required for indigent senior citizen going blind.", "MEDICAL"),

    # EMERGENCY
    ("Flash flood water entered our hut, trapped on roof, need rescue!", "EMERGENCY"),
    ("Fire broke out in slum cluster, multiple people trapped inside!", "EMERGENCY"),
    ("Violent attacker outside door threatening life, immediate help needed!", "EMERGENCY"),
    ("Severe accident victim unconscious on roadside bleeding heavily!", "EMERGENCY"),
    ("Suicidal thoughts and severe crisis, need urgent helpline and intervention!", "EMERGENCY"),
    ("Wall collapsed on sleeping family, people buried under debris!", "EMERGENCY"),
    ("Child kidnapped or missing from park, emergency alert required!", "EMERGENCY"),
    ("Gas cylinder leak with fire hazard, evacuation needed now!", "EMERGENCY"),
    ("Extreme hypothermia, unconscious homeless person unresponsive in frost!", "EMERGENCY"),
    ("Electric shock hazard with fallen live wire near water puddle!", "EMERGENCY"),
    ("Critical life threat situation, need emergency dispatch immediately!", "EMERGENCY"),
    ("Severe domestic violence victim locked in room, requires rescue.", "EMERGENCY"),
    ("Boat capsized near river bank, multiple drowning people need rescue.", "EMERGENCY"),
    ("Building showing structural cracks about to collapse, urgent evacuation.", "EMERGENCY"),
    ("Snake bite victim losing consciousness, urgent antivenom and transport!", "EMERGENCY"),
    ("Armed assault in progress near market, emergency police and medical needed.", "EMERGENCY"),
    ("Massive chemical fumes spreading from dumpster, people suffocating.", "EMERGENCY"),
    ("Heatstroke victim collapsed on road with seizure, life threatening.", "EMERGENCY"),

    # EDUCATION
    ("Need notebooks, pens, and textbooks for 5th grade student.", "EDUCATION"),
    ("Single mother unable to pay school tuition fees for daughter.", "EDUCATION"),
    ("Meritorious slum student needs second-hand laptop for online classes.", "EDUCATION"),
    ("Looking for volunteer math and science tutors for orphan children.", "EDUCATION"),
    ("Need school bag, geometry box, and stationery for poor boy.", "EDUCATION"),
    ("Requesting scholarship support for college engineering admission fees.", "EDUCATION"),
    ("Community library needs donated children's story books and encyclopedias.", "EDUCATION"),
    ("Need educational sponsorship for blind student to buy Braille books.", "EDUCATION"),
    ("Girl drop-out wants to resume 10th standard board exam coaching.", "EDUCATION"),
    ("Need English speaking and computer literacy classes for underprivileged youth.", "EDUCATION"),
    ("School fees due tomorrow, student facing expulsion without help.", "EDUCATION"),
    ("Requesting donation of used tablet or smartphone for digital learning.", "EDUCATION"),
    ("Need uniforms, stationery, and backpacks for 20 primary school kids.", "EDUCATION"),
    ("Seeking mentorship and career guidance for first-generation learners.", "EDUCATION"),
    ("Exam registration fees needed for poor student wanting to take entrance test.", "EDUCATION"),

    # EMPLOYMENT
    ("Daily wage construction laborer seeking work to support family.", "EMPLOYMENT"),
    ("Single mother looking for domestic helper or cooking job nearby.", "EMPLOYMENT"),
    ("Unemployed carpenter seeking carpentry tools to start earning livelihood.", "EMPLOYMENT"),
    ("Looking for security guard or watchman vacancy for retired honest person.", "EMPLOYMENT"),
    ("Need sewing machine to start home tailoring business and earn income.", "EMPLOYMENT"),
    ("Trained driver with valid driving license looking for taxi or delivery work.", "EMPLOYMENT"),
    ("Seeking vocational training in electrical repairs or plumbing.", "EMPLOYMENT"),
    ("Lost job due to factory closure, seeking any manual or office boy work.", "EMPLOYMENT"),
    ("Need micro-loan or bicycle to sell vegetables as street vendor.", "EMPLOYMENT"),
    ("Housekeeper looking for part-time cleaning jobs in apartments.", "EMPLOYMENT"),
    ("Young man looking for apprentice job in auto repair workshop.", "EMPLOYMENT"),
    ("Need resume assistance and job interview guidance for destitute graduate.", "EMPLOYMENT"),
    ("Elderly person capable of gardening looking for garden maintenance work.", "EMPLOYMENT"),
    ("Seeking tea stall or snack cart setup assistance for self-employment.", "EMPLOYMENT"),
    ("Need painter or whitewashing job for daily sustenance.", "EMPLOYMENT"),
]

# Variations to create a robust dataset of ~350 samples
variations = []
templates = {
    "FOOD": [
        "Please provide {item} for my family, we are starving.",
        "We desperately need {item} tonight.",
        "Can anyone donate {item} to our community?",
        "Homeless group needs urgent {item}.",
        "I am looking for {item} because we have no money for groceries.",
    ],
    "SHELTER": [
        "Need safe {item} for tonight, nowhere to sleep.",
        "Looking for {item} after being evicted.",
        "Urgent request for {item} for mother and children.",
        "Sleeping outdoors, need {item} immediately.",
        "Can an NGO provide {item} for an abandoned senior citizen?",
    ],
    "CLOTHING": [
        "Please donate {item} for poor families.",
        "Need {item} for cold weather and rain.",
        "Children have no {item}, please help.",
        "Looking for {item} for street dwellers.",
        "Urgent requirement for {item} in slum settlement.",
    ],
    "MEDICAL": [
        "Require urgent {item} for sick family member.",
        "Need financial aid for {item} at local clinic.",
        "Elderly person in pain, needs {item} immediately.",
        "Seeking free doctor consultation and {item}.",
        "Cannot afford {item} prescribed by hospital.",
    ],
    "EMERGENCY": [
        "CRITICAL: {item}, immediate help required!",
        "Life threatening: {item}, please send rescue team!",
        "Emergency alert: {item} happening right now!",
        "Urgent assistance needed, {item}!",
        "Help! {item} and we are trapped!",
    ],
    "EDUCATION": [
        "Need {item} for poor student studying in school.",
        "Requesting donation of {item} for underprivileged children.",
        "Seeking assistance to buy {item} for class.",
        "Help our children learn by providing {item}.",
        "Bright student needs {item} to continue education.",
    ],
    "EMPLOYMENT": [
        "Looking for {item} to earn daily wages.",
        "Need {item} to support my dependents.",
        "Experienced worker seeking {item} in town.",
        "Please connect me with {item} opportunity.",
        "Seeking {item} to become financially independent.",
    ],
}

items = {
    "FOOD": ["food packets", "cooked dinner", "rice and wheat rations", "baby milk formula", "bread and vegetables", "daily meals", "grocery kit", "drinking water and food"],
    "SHELTER": ["night shelter", "roof over our heads", "temporary housing", "dormitory bed", "shelter home accommodation", "safe place to sleep"],
    "CLOTHING": ["warm blankets", "winter clothes and sweaters", "raincoats and tarpaulin", "shoes and slippers", "second-hand garments", "school uniforms"],
    "MEDICAL": ["insulin and diabetes medications", "sterile bandages and dressing", "blood pressure tablets", "antibiotics and pain relief", "wheelchair and crutches", "urgent medical care"],
    "EMERGENCY": ["house collapse with trapped victims", "violent attack in progress", "severe road accident with bleeding", "slum fire spreading rapidly", "river flood water rising"],
    "EDUCATION": ["school textbooks and notebooks", "examination fees", "school bag and stationery kit", "laptop for engineering study", "tuition coaching fees"],
    "EMPLOYMENT": ["day labor work", "domestic helper job", "sewing machine for tailoring", "delivery rider job", "security guard employment", "gardening and cleaning work"],
}

for cat, t_list in templates.items():
    for tmpl in t_list:
        for itm in items[cat]:
            variations.append((tmpl.format(item=itm), cat))

all_samples = data + variations

output_path = os.path.join(os.path.dirname(__file__), "dataset.csv")
with open(output_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "category"])
    for text, cat in all_samples:
        writer.writerow([text, cat])

print(f"Dataset generated with {len(all_samples)} samples across 7 categories at {output_path}")
