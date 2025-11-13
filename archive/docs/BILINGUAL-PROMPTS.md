# Bilingual AI Enrichment Prompts - GEO Optimized

**Version**: 2.0
**Date**: November 4, 2025
**Purpose**: Generate 420-word descriptions for Athens events in English + Greek with full GEO optimization

---

## English Prompt Template (GEO-Optimized)

### Complete Prompt

```
TASK: Generate a GEO-optimized 420-word description for this Athens cultural event.

EVENT DATA:
- Title: {title}
- Type: {type}
- Venue: {venue_name}
- Neighborhood: {venue_neighborhood}
- Date: {start_date}
- Time: {time}
- Genre: {genres}
- Price: {price_type} {price_amount ? `(€${price_amount})` : ''}
- Short Description: {description}
- URL: {url}

REQUIREMENTS:

1. WORD COUNT: Exactly 420 words (±5 acceptable: 415-425 words)
   - This compensates for paragraph formatting losses
   - Final database word count will be ~390-410 words
   - Count carefully - use actual word count, not estimate

2. GEO OPTIMIZATION (Critical for AI Citation):

   a) Answer Direct User Queries:
      - Structure content to answer: "What is [event]?"
      - Include: "Who is performing/exhibiting?"
      - Address: "Where in Athens is this?"
      - Answer: "What can I expect to experience?"

   b) Entity Recognition Helpers:
      - Artists: "American jazz saxophonist [Name]" (not just "[Name]")
      - Venues: "[Venue Name] in [Neighborhood], Athens" (full context)
      - Events: "This [jazz/theater/art] [concert/performance/exhibition]..."
      - Always provide descriptive context for proper nouns

   c) Factual Density (Include 5+ Verifiable Facts):
      - Exact dates, times, and prices
      - Historical context: "Established in 1985...", "Since opening in..."
      - Awards/credentials: "Grammy-nominated...", "Winner of..."
      - Previous work: "Following their 2024 European tour..."
      - Collaborations: "Known for work with..."
      - Specific numbers: "50 photographs", "3-act play", "90-minute performance"

   d) Semantic Keyword Clusters (Use Related Terms):
      - Jazz events → Include: "improvisation", "bebop", "swing", "Blue Note", "live performance"
      - Exhibitions → Include: "curator", "installation", "contemporary art", "gallery", "visual art"
      - Theater → Include: "playwright", "director", "dramatic performance", "stage production"
      - Create semantic web that AI engines recognize

   e) Natural Language Query Matching:
      - Write sentences that directly answer common questions
      - Example: "For those seeking authentic jazz..." (matches: "I'm looking for jazz in Athens")
      - Example: "This exhibition showcases..." (matches: "What does [exhibition] feature?")
      - Example: "The performance begins at..." (matches: "What time is [event]?")

   f) Authority Signals (E-E-A-T Principles):
      - Venue history/reputation: "[Venue] has been Athens' premier jazz club since..."
      - Artist credentials: "Studied under...", "Performed at..."
      - Cultural significance: "Part of Athens' vibrant jazz scene..."
      - Expert knowledge: "Known for intimate acoustics that..."

3. STRUCTURE (5-6 Well-Formed Paragraphs):

   **Paragraph 1 (60-80 words): The Hook**
   - Open with what makes this event unique/compelling
   - Include event type, key artist/attraction, venue
   - Establish cultural significance
   - Example: "Grammy-nominated jazz vocalist Stacey Kent brings her enchanting voice to the Megaron Concert Hall on November 13..."

   **Paragraph 2 (70-90 words): Artist/Content Background**
   - Artist biography, credentials, style
   - Previous work, awards, notable collaborations
   - What makes them distinctive
   - Include verifiable facts (albums, awards, years)

   **Paragraph 3 (70-90 words): Venue + Athens Context**
   - Venue description and reputation
   - Athens neighborhood character and atmosphere
   - Geographic/cultural context
   - Why this venue suits this event
   - Example: "The Megaron, located in Kolonaki, Athens' cultural heart, provides..."

   **Paragraph 4 (70-90 words): Experience Description**
   - What audience will experience
   - Performance/exhibition details
   - Atmosphere, mood, vibe
   - What makes it special
   - Format, duration, interaction style

   **Paragraph 5 (60-80 words): Practical Details**
   - Weave in naturally: time, date, price
   - Accessibility, how to attend
   - Special notes (tickets required, reservations, etc.)
   - NOT a dry list - integrate smoothly

   **Paragraph 6 (60-80 words): Compelling Close**
   - Why this matters / why attend
   - Who should come
   - What they'll take away
   - Memorable closing thought
   - NO generic marketing language

4. TONE & STYLE:

   - **Authentic**: Culturally informed, not marketing fluff
   - **Confident**: You are an expert on Athens culture
   - **Natural**: Conversational, how people actually speak
   - **Informative**: Rich with facts, light on adjectives
   - **International**: Written for tourists and English-speaking expats
   - **Sophisticated**: Assumes culturally curious audience

5. CONTENT REQUIREMENTS:

   - Athens neighborhood MUST be mentioned with character description
   - Venue context MUST be included (reputation, history, atmosphere)
   - At least ONE verifiable fact about artist/content (year, award, collaboration)
   - Price information woven naturally (not just listed)
   - Cultural context of Athens mentioned (e.g., "Athens' thriving jazz scene")

6. FORBIDDEN (Critical - Will Invalidate Description):

   - NO fabricated information (dates, performers, venues, awards, years)
   - NO generic marketing speak: "don't miss", "once in a lifetime", "unmissable"
   - NO invented artist biographies or venue histories
   - NO superlatives without basis: "best", "greatest", "most amazing"
   - NO claims you cannot verify from the EVENT DATA provided
   - If information is unavailable, omit it gracefully - DO NOT invent

7. SELF-VALIDATION CHECKLIST (Verify Before Returning):

   ✓ Word count: 415-425 words
   ✓ 5-6 paragraphs with double newlines between
   ✓ Athens neighborhood mentioned with description
   ✓ Venue context included (reputation/atmosphere)
   ✓ At least 5 verifiable facts included
   ✓ Semantic keyword clusters present
   ✓ Answers likely user queries
   ✓ No fabricated information
   ✓ No marketing language
   ✓ Natural, authentic tone
   ✓ Practical details integrated smoothly

OUTPUT FORMAT:
- Plain text only
- Paragraphs separated by double newlines (\n\n)
- No markdown, HTML, or formatting
- No meta-commentary, just the description
```

---

## Greek Prompt Template (GEO-Optimized)

### Complete Prompt

```
ΕΡΓΑΣΙΑ: Δημιουργήστε περιγραφή 420 λέξεων βελτιστοποιημένη για GEO για αυτήν την πολιτιστική εκδήλωση στην Αθήνα.

ΔΕΔΟΜΕΝΑ ΕΚΔΗΛΩΣΗΣ:
- Τίτλος: {title}
- Τύπος: {type}
- Χώρος: {venue_name}
- Γειτονιά: {venue_neighborhood}
- Ημερομηνία: {start_date}
- Ώρα: {time}
- Είδος: {genres}
- Τιμή: {price_type} {price_amount ? `(€${price_amount})` : ''}
- Σύντομη Περιγραφή: {description}
- URL: {url}

ΑΠΑΙΤΗΣΕΙΣ:

1. ΑΡΙΘΜΟΣ ΛΕΞΕΩΝ: Ακριβώς 420 λέξεις (±10 αποδεκτές: 410-430 λέξεις)
   - Οι ελληνικές λέξεις είναι συνήθως μακρύτερες - μεγαλύτερη ευελιξία στο όριο
   - Τελική βάση δεδομένων: ~380-410 λέξεις
   - Μετρήστε προσεκτικά - χρησιμοποιήστε πραγματικό αριθμό λέξεων

2. ΒΕΛΤΙΣΤΟΠΟΙΗΣΗ GEO (Κρίσιμο για Αναφορές AI):

   a) Απάντηση σε Άμεσες Ερωτήσεις Χρηστών:
      - Δομήστε το περιεχόμενο για να απαντήσετε: "Τι είναι το [εκδήλωση];"
      - Συμπεριλάβετε: "Ποιος παίζει/εκθέτει;"
      - Απευθύνετε: "Πού στην Αθήνα είναι αυτό;"
      - Απαντήστε: "Τι να περιμένω να βιώσω;"

   b) Βοηθητές Αναγνώρισης Οντοτήτων:
      - Καλλιτέχνες: "Ο Αμερικανός σαξοφωνίστας τζαζ [Όνομα]" (όχι απλά "[Όνομα]")
      - Χώροι: "[Όνομα Χώρου] στο [Γειτονιά], Αθήνα" (πλήρες πλαίσιο)
      - Εκδηλώσεις: "Αυτή η [τζαζ/θεατρική/καλλιτεχνική] [συναυλία/παράσταση/έκθεση]..."
      - Πάντα παρέχετε περιγραφικό πλαίσιο για κύρια ονόματα

   c) Πυκνότητα Γεγονότων (Συμπεριλάβετε 5+ Επαληθεύσιμα Γεγονότα):
      - Ακριβείς ημερομηνίες, ώρες και τιμές
      - Ιστορικό πλαίσιο: "Ιδρύθηκε το 1985...", "Από το άνοιγμά του..."
      - Βραβεία/διαπιστευτήρια: "Υποψήφιος για Grammy...", "Νικητής του..."
      - Προηγούμενη δουλειά: "Μετά την ευρωπαϊκή τους περιοδεία το 2024..."
      - Συνεργασίες: "Γνωστός για τη δουλειά του με..."
      - Συγκεκριμένοι αριθμοί: "50 φωτογραφίες", "παράσταση 3 πράξεων", "διάρκεια 90 λεπτών"

   d) Σημασιολογικά Clusters Λέξεων-Κλειδιών (Χρησιμοποιήστε Σχετικούς Όρους):
      - Εκδηλώσεις τζαζ → Συμπεριλάβετε: "αυτοσχεδιασμός", "bebop", "swing", "ζωντανή παράσταση"
      - Εκθέσεις → Συμπεριλάβετε: "επιμελητής", "εγκατάσταση", "σύγχρονη τέχνη", "γκαλερί", "οπτική τέχνη"
      - Θέατρο → Συμπεριλάβετε: "θεατρικός συγγραφέας", "σκηνοθέτης", "δραματική παράσταση", "σκηνική παραγωγή"
      - Δημιουργήστε σημασιολογικό ιστό που οι μηχανές AI αναγνωρίζουν

   e) Αντιστοίχιση Φυσικών Γλωσσικών Ερωτήσεων:
      - Γράψτε προτάσεις που απαντούν απευθείας σε κοινές ερωτήσεις
      - Παράδειγμα: "Για όσους αναζητούν αυθεντική τζαζ..." (ταιριάζει: "Ψάχνω για τζαζ στην Αθήνα")
      - Παράδειγμα: "Η έκθεση παρουσιάζει..." (ταιριάζει: "Τι παρουσιάζει η [έκθεση];")
      - Παράδειγμα: "Η παράσταση ξεκινά..." (ταιριάζει: "Τι ώρα είναι το [εκδήλωση];")

   f) Σήματα Αυθεντικότητας (Αρχές E-E-A-T):
      - Ιστορία/φήμη χώρου: "[Χώρος] είναι η κορυφαία αίθουσα τζαζ της Αθήνας από..."
      - Διαπιστευτήρια καλλιτέχνη: "Σπούδασε υπό...", "Παρουσίασε στο..."
      - Πολιτισμική σημασία: "Μέρος της ζωντανής σκηνής τζαζ της Αθήνας..."
      - Εξειδικευμένη γνώση: "Γνωστός για την οικεία ακουστική που..."

3. ΔΟΜΗ (5-6 Καλοσχηματισμένες Παράγραφοι):

   **Παράγραφος 1 (60-80 λέξεις): Το Άγκιστρο**
   - Ανοίξτε με αυτό που κάνει αυτήν την εκδήλωση μοναδική/συναρπαστική
   - Συμπεριλάβετε τύπο εκδήλωσης, βασικό καλλιτέχνη/έλξη, χώρο
   - Καθιερώστε πολιτισμική σημασία

   **Παράγραφος 2 (70-90 λέξεις): Ιστορικό Καλλιτέχνη/Περιεχομένου**
   - Βιογραφία καλλιτέχνη, διαπιστευτήρια, στυλ
   - Προηγούμενη εργασία, βραβεία, αξιοσημείωτες συνεργασίες
   - Τι τους κάνει διακριτικούς
   - Συμπεριλάβετε επαληθεύσιμα γεγονότα

   **Παράγραφος 3 (70-90 λέξεις): Χώρος + Πλαίσιο Αθήνας**
   - Περιγραφή και φήμη χώρου
   - Χαρακτήρας και ατμόσφαιρα γειτονιάς Αθήνας
   - Γεωγραφικό/πολιτισμικό πλαίσιο
   - Γιατί αυτός ο χώρος ταιριάζει σε αυτήν την εκδήλωση

   **Παράγραφος 4 (70-90 λέξεις): Περιγραφή Εμπειρίας**
   - Τι θα βιώσει το κοινό
   - Λεπτομέρειες παράστασης/έκθεσης
   - Ατμόσφαιρα, διάθεση, vibe
   - Τι την κάνει ξεχωριστή
   - Μορφή, διάρκεια, στυλ αλληλεπίδρασης

   **Παράγραφος 5 (60-80 λέξεις): Πρακτικές Λεπτομέρειες**
   - Υφάνετε φυσικά: ώρα, ημερομηνία, τιμή
   - Προσβασιμότητα, πώς να παρακολουθήσετε
   - Ειδικές σημειώσεις (απαιτούνται εισιτήρια, κρατήσεις κ.λπ.)
   - ΟΧΙ ξηρή λίστα - ενσωματώστε ομαλά

   **Παράγραφος 6 (60-80 λέξεις): Συναρπαστικό Κλείσιμο**
   - Γιατί έχει σημασία / γιατί να παρακολουθήσετε
   - Ποιος πρέπει να έρθει
   - Τι θα πάρουν μαζί τους
   - Αξέχαστη τελική σκέψη
   - ΧΩΡΙΣ γενική διαφημιστική γλώσσα

4. ΥΦΟΣ & ΣΤΥΛ:

   - **Αυθεντικό**: Πολιτισμικά ενημερωμένο, όχι διαφημιστική βλακεία
   - **Σίγουρο**: Είστε ειδικός στον πολιτισμό της Αθήνας
   - **Φυσικό**: Συνομιλιακό, όπως μιλούν πραγματικά οι άνθρωποι
   - **Ενημερωτικό**: Πλούσιο σε γεγονότα, ελαφρύ σε επίθετα
   - **Τοπικό**: Γραμμένο για Έλληνες που ανακαλύπτουν την πόλη τους
   - **Εκλεπτυσμένο**: Υποθέτει πολιτισμικά περίεργο κοινό

5. ΑΠΑΙΤΗΣΕΙΣ ΠΕΡΙΕΧΟΜΕΝΟΥ:

   - Η γειτονιά της Αθήνας ΠΡΕΠΕΙ να αναφέρεται με περιγραφή χαρακτήρα
   - Το πλαίσιο του χώρου ΠΡΕΠΕΙ να συμπεριληφθεί (φήμη, ιστορία, ατμόσφαιρα)
   - Τουλάχιστον ΕΝΑ επαληθεύσιμο γεγονός για καλλιτέχνη/περιεχόμενο
   - Πληροφορίες τιμής υφασμένες φυσικά (όχι απλά λίστα)
   - Πολιτισμικό πλαίσιο της Αθήνας αναφέρεται

6. ΑΠΑΓΟΡΕΥΜΕΝΑ (Κρίσιμο - Θα Ακυρώσει την Περιγραφή):

   - ΧΩΡΙΣ πλαστές πληροφορίες (ημερομηνίες, performers, χώρους, βραβεία, έτη)
   - ΧΩΡΙΣ γενική διαφημιστική ομιλία: "μην χάσετε", "μοναδική ευκαιρία"
   - ΧΩΡΙΣ επινοημένα βιογραφικά καλλιτεχνών ή ιστορίες χώρων
   - ΧΩΡΙΣ υπερθετικά χωρίς βάση: "καλύτερος", "μεγαλύτερος"
   - ΧΩΡΙΣ ισχυρισμούς που δεν μπορείτε να επαληθεύσετε από τα ΔΕΔΟΜΕΝΑ ΕΚΔΗΛΩΣΗΣ
   - Αν οι πληροφορίες δεν είναι διαθέσιμες, παραλείψτε τις με χάρη - ΜΗΝ επινοήσετε

7. ΛΙΣΤΑ ΑΥΤΟ-ΕΠΙΚΥΡΩΣΗΣ (Επαληθεύστε Πριν την Επιστροφή):

   ✓ Αριθμός λέξεων: 410-430 λέξεις
   ✓ 5-6 παράγραφοι με διπλά newlines μεταξύ
   ✓ Γειτονιά Αθήνας αναφέρεται με περιγραφή
   ✓ Πλαίσιο χώρου συμπεριληφθεί (φήμη/ατμόσφαιρα)
   ✓ Τουλάχιστον 5 επαληθεύσιμα γεγονότα συμπεριληφθέντα
   ✓ Σημασιολογικά clusters λέξεων-κλειδιών παρόντα
   ✓ Απαντά σε πιθανές ερωτήσεις χρηστών
   ✓ Χωρίς πλαστές πληροφορίες
   ✓ Χωρίς διαφημιστική γλώσσα
   ✓ Φυσικό, αυθεντικό ύφος
   ✓ Πρακτικές λεπτομέρειες ενσωματωμένες ομαλά

ΜΟΡΦΗ ΕΞΟΔΟΥ:
- Μόνο απλό κείμενο
- Παράγραφοι χωρισμένες με διπλά newlines (\n\n)
- Χωρίς markdown, HTML ή μορφοποίηση
- Χωρίς μετα-σχόλια, μόνο την περιγραφή
```

---

## Usage Notes

### For Task Tool Calls

When using these prompts with the Task tool:

1. **Replace placeholders** with actual event data:
   - `{title}`, `{venue_name}`, etc.

2. **Request JSON output format**:
   ```json
   {
     "event_id": "event-id-here",
     "full_description": "The generated 420-word description...",
     "word_count": 418,
     "language": "en" or "gr"
   }
   ```

3. **Batch processing**:
   - Process 20 events at a time for monitoring
   - Generate EN and GR separately for better control
   - Validate word counts before database import

### Validation Criteria

**Automatic checks:**
- Word count: EN 380-420, GR 370-450
- No empty paragraphs
- Contains Athens neighborhood mention
- Contains venue context

**Manual checks (sample):**
- No fabricated information
- Authentic, non-marketing tone
- GEO elements present
- Cultural appropriateness

---

**Document Version**: 2.0
**Last Updated**: November 4, 2025
**Status**: READY FOR TESTING
