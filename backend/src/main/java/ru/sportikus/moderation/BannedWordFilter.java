package ru.sportikus.moderation;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Первый этап автопроверки: быстрый поиск запрещённых тем по словарю.
 *
 * <p>Фильтр не выносит приговор — он только поднимает <b>сомнение</b>. «Без алкоголя»,
 * «шахматная партия на деньги?» или «бои по правилам ММА» решает уже ИИ. Поэтому словарь
 * намеренно чуть шире, чем нужно, а точность обеспечивает второй этап.
 *
 * <p>Текст проверяется в трёх вариантах: как есть; с заменой латинских и цифровых двойников
 * на кириллицу («вoдкa», «в0дка»); со склейкой букв, разделённых точками, дефисами и пробелами
 * («в.о.д.к.а», «в о д к а»).
 */
@Component
public class BannedWordFilter {

    private static final int MAX_HITS = 20;
    /** Окончания и продолжения слова. */
    private static final String W = "\\p{L}*";
    private static final String START = "(?<![\\p{L}\\p{N}])";
    private static final String END = "(?![\\p{L}\\p{N}])";

    private record Rule(ContentCategory category, Pattern pattern) {
    }

    private static Rule rule(ContentCategory category, String fragment) {
        return new Rule(category, Pattern.compile(START + "(?:" + fragment + ")" + END));
    }

    private static final List<Rule> RULES = List.of(
            // --- политика
            rule(ContentCategory.POLITICS, "политик" + W + "|политическ" + W + "|митинг" + W + "|пикет" + W
                    + "|агитац" + W + "|агитир" + W + "|предвыборн" + W + "|депутат" + W + "|оппозиц" + W
                    + "|референдум" + W + "|партийн" + W + "|протест(?!ир)" + W + "|революц" + W + "|санкци" + W
                    + "|мобилизац" + W + "|спецоперац" + W + "|сво|кпрф|лдпр|единая\\s+россия"
                    + "|навальн" + W + "|путин" + W + "|зеленск" + W),
            // --- алкоголь
            rule(ContentCategory.ALCOHOL, "алкогол" + W + "|алко(тур|вечерин|пати|бар)" + W
                    + "|пив(о|а|у|ом|е)|пивн(ой|ая|ое|ые|ых|ого|ому|ую|ым)|пивас" + W
                    + "|водк" + W + "|вин(о|ом)|винн" + W + "\\s+(дегустац|карт|бар|погреб)" + W
                    + "|коньяк" + W + "|виски|текил" + W + "|шампанск" + W + "|самогон" + W + "|наливк" + W
                    + "|настойк" + W + "\\s+(на\\s+)?(спирт|водк)" + W + "|бухл" + W
                    + "|бух(ать|аем|ают|нем|нуть|ло|лишко)" + W + "|пьянк" + W + "|пьян(ый|ая|ые|ых|ство)" + W
                    + "|выпивк" + W + "|выпить|выпьем|паб|пабы|пабов|бар-?хоппинг" + W
                    + "|beer|vodka|wine|whisk(e)?y|alcohol"),
            // --- табак и никотин
            rule(ContentCategory.TOBACCO, "кальян" + W + "|сигарет" + W + "|сигар(а|ы|у|ой)|вейп" + W + "|табак" + W
                    + "|табач" + W + "|никотин" + W + "|курени" + W + "|покурим|покурить|снюс" + W + "|айкос|iqos|vape"),
            // --- наркотики и допинг
            rule(ContentCategory.DRUGS, "наркот" + W + "|марихуан" + W + "|каннабис" + W + "|конопл" + W
                    + "|гашиш" + W + "|закладк" + W + "|спайс" + W + "|мефедрон" + W
                    + "|амфетамин" + W + "|кокаин" + W + "|героин" + W + "|экстази|лсд|психоделик" + W
                    + "|стероид" + W + "|анабол" + W + "|допинг" + W),
            // --- азартные игры и ставки
            rule(ContentCategory.GAMBLING, "казино|букмекер" + W + "|тотализатор" + W + "|покер" + W + "|рулетк" + W
                    + "|ставк(и|ок|ам|ах)\\s+на\\s+(спорт|матч|исход)" + W + "|игров(ые|ых)\\s+автомат" + W
                    + "|на\\s+деньги|1xbet|фонбет|fonbet|winline|винлайн|бетбум|betboom|лига\\s+ставок|casino"),
            // --- дискриминация и ненависть
            rule(ContentCategory.DISCRIMINATION, "дискримин" + W
                    + "|только\\s+для\\s+(русских|славян|белых|христиан|мусульман|натуралов|гетеро|своих)"
                    + "|без\\s+(мигрантов|приезжих|кавказцев|азиатов|черных|чернокожих|евреев|геев|инвалидов|цыган)"
                    + "|(мигрант|приезж|кавказц|азиат|чернокож|евре|гей|инвалид|цыган)" + W
                    + "\\s+(не\\s+допуска|не\\s+приглаш|запрещ|нельзя)" + W
                    + "|чурк" + W + "|хач(и|ей|ам|ами|ик|ики|иков)?|ниггер" + W + "|негр(ы|ов|ам|ами|а|у)?"
                    + "|жид(ы|ов|ам|ами|овск" + W + ")?|пидор" + W + "|пидар" + W
                    + "|хохл(ы|ов|ам|ами|а|у|ушк" + W + ")?|москал" + W
                    + "|рус(ня|ни|ню|не)|нацист" + W + "|фашист" + W + "|расист" + W + "|зиг\\s*хайл" + W
                    + "|white\\s+power"),
            // --- насилие и экстремизм
            rule(ContentCategory.VIOLENCE, "оружи" + W + "|пистолет" + W + "|драк(а|и|у|ой|е)|бои\\s+без\\s+правил"
                    + "|насили" + W + "|взрывчатк" + W + "|теракт" + W + "|экстремис" + W + "|террорис" + W),
            // --- контент 18+
            rule(ContentCategory.ADULT, "секс" + W + "|эроти" + W + "|интим" + W + "|порн" + W + "|стриптиз" + W
                    + "|эскорт" + W + "|проститу" + W + "|onlyfans|18\\+"),
            // --- финансовые схемы, торговля и спам
            rule(ContentCategory.FRAUD, "криптовалют" + W + "|крипт(а|у|ой|е)|биткоин" + W + "|биржев" + W
                    + "|трейдинг" + W + "|инвестиц" + W + "|пассивн" + W + "\\s+доход" + W
                    + "|сетев(ой|ого|ом)\\s+маркетинг" + W + "|mlm|финансов" + W + "\\s+пирамид" + W
                    + "|заработ(ок|ать|аем|ай|ка)" + W + "|кредит(ы|ов|а|у|ом|ам|ный|ная|ные|ка|ки|ку)?"
                    + "|займ(ы|ов|а|ам|ами|ах)?|заем"
                    + "|продам|продаю|оптом|скидк(а|и)\\s+на\\s+товар" + W),
            // --- нецензурная лексика
            rule(ContentCategory.PROFANITY, "(рас|вы|за|на|с|от|при)?пизд" + W + "|хуй" + W + "|хуя|хуев" + W
                    + "|хуесос" + W + "|(вы|за|на|у|от|по|про)?еб(ан|ат|ал|ош|уч)" + W + "|бля|блять|бляд" + W
                    + "|сука|суки|мудак" + W + "|мудил" + W + "|залуп" + W + "|гандон" + W + "|шлюх" + W)
    );

    /** Латинские и цифровые двойники кириллических букв. */
    private static final Map<Character, Character> LOOKALIKES = Map.ofEntries(
            Map.entry('a', 'а'), Map.entry('b', 'в'), Map.entry('c', 'с'), Map.entry('e', 'е'),
            Map.entry('h', 'н'), Map.entry('k', 'к'), Map.entry('m', 'м'), Map.entry('o', 'о'),
            Map.entry('p', 'р'), Map.entry('t', 'т'), Map.entry('x', 'х'), Map.entry('y', 'у'),
            Map.entry('0', 'о'), Map.entry('3', 'з'), Map.entry('4', 'ч'), Map.entry('6', 'б'),
            Map.entry('@', 'а'));

    private static final Pattern INNER_SEPARATORS = Pattern.compile("(?<=\\p{L})[.\\-_*·]+(?=\\p{L})");
    private static final Pattern SPACED_LETTERS =
            Pattern.compile("(?<!\\p{L})\\p{L}(?!\\p{L})(?:\\s+\\p{L}(?!\\p{L})){2,}");

    /** Все срабатывания по всем полям (без повторов, не больше {@value #MAX_HITS}). */
    public List<ModerationHit> scan(ModerationText text) {
        Map<String, ModerationHit> hits = new LinkedHashMap<>();
        text.fields().forEach((field, value) -> {
            for (String variant : variants(value)) {
                for (Rule rule : RULES) {
                    Matcher m = rule.pattern().matcher(variant);
                    while (m.find() && hits.size() < MAX_HITS) {
                        String term = m.group().trim().replaceAll("\\s+", " ");
                        hits.putIfAbsent(rule.category() + ":" + term, new ModerationHit(rule.category(), term, field));
                    }
                }
            }
        });
        return new ArrayList<>(hits.values());
    }

    static List<String> variants(String raw) {
        String base = raw.toLowerCase(Locale.ROOT).replace('ё', 'е');
        String folded = fold(base);
        Set<String> result = new LinkedHashSet<>(List.of(base, folded, squeeze(folded)));
        return new ArrayList<>(result);
    }

    private static String fold(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            sb.append(LOOKALIKES.getOrDefault(c, c));
        }
        return sb.toString();
    }

    /** «в.о.д.к.а» → «водка», «в о д к а» → «водка». */
    private static String squeeze(String s) {
        String joined = INNER_SEPARATORS.matcher(s).replaceAll("");
        Matcher m = SPACED_LETTERS.matcher(joined);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, Matcher.quoteReplacement(m.group().replaceAll("\\s+", "")));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
