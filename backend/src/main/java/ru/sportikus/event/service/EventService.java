package ru.sportikus.event.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.sportikus.city.repository.CityRepository;
import ru.sportikus.common.ApiException;
import ru.sportikus.common.Strings;
import ru.sportikus.event.cache.MapCache;
import ru.sportikus.event.cache.MapCacheInvalidator;
import ru.sportikus.event.cache.MapCacheKey;
import ru.sportikus.event.dto.CreateEventRequest;
import ru.sportikus.event.dto.EventFilter;
import ru.sportikus.event.dto.EventResponse;
import ru.sportikus.event.model.Event;
import ru.sportikus.event.model.EventStatus;
import ru.sportikus.event.model.JoinMode;
import ru.sportikus.event.model.OrgDetails;
import ru.sportikus.event.model.ProgramItem;
import ru.sportikus.event.model.RecurrenceRule;
import ru.sportikus.event.model.SkillLevel;
import ru.sportikus.event.repository.EventGeoRepository;
import ru.sportikus.event.repository.EventRepository;
import ru.sportikus.event.repository.EventSpecs;
import ru.sportikus.form.CustomField;
import ru.sportikus.form.FieldDef;
import ru.sportikus.form.FieldValidator;
import ru.sportikus.moderation.EventModerationService;
import ru.sportikus.organization.model.Organization;
import ru.sportikus.organization.model.OrganizationStatus;
import ru.sportikus.organization.repository.OrganizationRepository;
import ru.sportikus.security.AuthUser;
import ru.sportikus.security.Roles;
import ru.sportikus.sport.model.Sport;
import ru.sportikus.sport.service.SportService;
import ru.sportikus.template.model.EventTemplate;
import ru.sportikus.template.repository.TemplateRepository;
import ru.sportikus.user.model.User;
import ru.sportikus.user.repository.UserRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventService {

    private static final Duration MAX_DURATION = Duration.ofDays(30);
    private static final Duration MAX_ADVANCE = Duration.ofDays(730);

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final TemplateRepository templateRepository;
    private final SportService sportService;
    private final FieldValidator fieldValidator;
    private final EventMapper mapper;
    private final EventGeoRepository geoRepository;
    private final CityRepository cityRepository;
    private final EventModerationService moderationService;
    private final MapCache mapCache;
    private final MapCacheInvalidator mapCacheInvalidator;

    // ------------------------------------------------------------------ чтение

    /** Максимум событий в одном ответе каталога: при масштабе страны каталог всегда ограничен. */
    private static final int CATALOG_LIMIT = 500;
    private static final double MAX_RADIUS_KM = 300;

    @Transactional(readOnly = true)
    public List<EventResponse> catalog(EventFilter requested, Optional<AuthUser> viewer) {
        // Список без данных пользователя кэшируется (Redis), друзья/своя заявка/права подмешиваются на каждый запрос
        EventFilter filter = MapCacheKey.normalize(requested);
        List<EventResponse> base = null;
        boolean cacheable = MapCacheKey.cacheable(filter);
        String key = null;
        long version = -1;
        if (cacheable) {
            key = MapCacheKey.of(filter);
            version = mapCache.version();
            base = mapCache.get(version, key).orElse(null);
        }
        if (base == null) {
            base = loadCatalog(filter);
            if (cacheable) {
                mapCache.put(version, key, base);
            }
        }
        return mapper.withViewer(base, viewer.map(AuthUser::id).orElse(null));
    }

    private List<EventResponse> loadCatalog(EventFilter filter) {
        Specification<Event> spec = EventSpecs.catalog(filter, Instant.now());
        if (filter.lat() != null && filter.lng() != null) {
            double radius = Math.min(filter.radiusKm() == null ? 50 : filter.radiusKm(), MAX_RADIUS_KM);
            List<Long> nearby = geoRepository.publishedWithin(filter.lat(), filter.lng(), radius, CATALOG_LIMIT * 2);
            if (nearby.isEmpty()) {
                return List.of();
            }
            spec = spec.and((root, query, cb) -> root.get("id").in(nearby));
        }
        List<Event> events = eventRepository.findAll(spec, PageRequest.of(0, CATALOG_LIMIT, Sort.by("startTime")))
                .getContent();
        return mapper.toList(events, null, false);
    }

    /** Карточка доступна по прямой ссылке и для снятых с публикации мероприятий (с указанием причины). */
    @Transactional(readOnly = true)
    public EventResponse details(Long id, Optional<AuthUser> viewer) {
        Event event = eventRepository.requireDetailed(id);
        return mapper.toDetails(event, viewer.map(AuthUser::id).orElse(null),
                viewer.map(AuthUser::isAdmin).orElse(false));
    }

    /** Мероприятия, которыми управляет пользователь (свои и своей организации), с числом заявок в ожидании. */
    @Transactional(readOnly = true)
    public List<EventResponse> managedBy(AuthUser user) {
        return mapper.toList(eventRepository.findManagedBy(user.id()), user.id(), true);
    }

    // ----------------------------------------------------------------- создание

    @Transactional
    public EventResponse create(AuthUser auth, CreateEventRequest req) {
        User author = userRepository.findById(auth.id())
                .orElseThrow(() -> ApiException.unauthorized("Пользователь не найден, войдите заново"));
        Organization org = resolveOrganization(author);

        EventTemplate template = null;
        if (req.templateId() != null) {
            template = templateRepository.findByIdAndActiveTrue(req.templateId())
                    .orElseThrow(() -> ApiException.badRequest("Шаблон мероприятия не найден"));
            if (template.isOrganizationOnly() && org == null) {
                throw ApiException.forbidden("Шаблон «" + template.getName() + "» доступен только организациям");
            }
        }

        validateSchedule(req);
        if (req.minAge() != null && req.maxAge() != null && req.minAge() > req.maxAge()) {
            throw ApiException.badRequest("Минимальный возраст не может быть больше максимального");
        }

        List<FieldDef> fields = template == null ? List.of() : template.getFields();
        Map<String, Object> details = fieldValidator.validateValues(fields, req.details(), "Параметры мероприятия");

        List<FieldDef> registrationFields = req.registrationFields() != null
                ? fieldValidator.validateDefinitions(req.registrationFields(), "Вопросы участнику")
                : (template == null ? List.of() : template.getRegistrationFields());

        OrgDetails orgDetails = org == null ? rejectOrgDetails(req.orgDetails()) : normalizeOrgDetails(req.orgDetails());

        Sport sport = sportService.resolve(req.sportId(), req.customSportName(), author);
        RecurrenceRule recurrenceRule = req.recurrenceRule() == null ? RecurrenceRule.NONE : req.recurrenceRule();
        Integer recurrenceIntervalDays = recurrenceRule == RecurrenceRule.WEEKLY
                ? 7 : recurrenceRule == RecurrenceRule.CUSTOM ? req.recurrenceIntervalDays() : null;
        if (recurrenceRule == RecurrenceRule.CUSTOM && recurrenceIntervalDays == null) {
            throw ApiException.badRequest("Укажите интервал повторения в днях");
        }

        Event event = Event.builder()
                .title(req.title().trim())
                .description(Strings.blankToNull(req.description()))
                .sport(sport)
                .template(template)
                .organizerUser(org == null ? author : null)
                .organizerOrg(org)
                .startTime(req.startTime())
                .endTime(req.endTime())
                .recurrenceRule(recurrenceRule)
                .recurrenceIntervalDays(recurrenceIntervalDays)
                .recurrenceSeriesId(recurrenceRule != RecurrenceRule.NONE ? UUID.randomUUID() : null)
                .lat(req.lat())
                .lng(req.lng())
                .address(req.address().trim())
                .capacity(req.capacity())
                .joinMode(req.joinMode() != null ? req.joinMode()
                        : template != null ? template.getDefaultJoinMode() : JoinMode.APPROVAL)
                .skillLevel(req.skillLevel() != null ? req.skillLevel()
                        : template != null ? template.getDefaultSkillLevel() : SkillLevel.ANY)
                .requiredEquipment(Strings.blankToNull(req.requiredEquipment()))
                .price(req.price() == null || req.price().signum() == 0 ? null : req.price())
                .registrationDeadline(req.registrationDeadline())
                .minAge(req.minAge())
                .maxAge(req.maxAge())
                .fields(new ArrayList<>(fields))
                .details(details)
                .customFields(normalizeCustomFields(req.customFields()))
                .registrationFields(new ArrayList<>(registrationFields))
                .orgDetails(orgDetails)
                .build();
        // Местный часовой пояс и город — по ближайшему городу из справочника
        cityRepository.findNearest(req.lat(), req.lng()).ifPresent(city -> {
            event.setCity(city);
            event.setTimeZone(city.getTimeZone());
        });
        // Автопроверка, этап 1: фильтр слов. Сомнительное мероприятие сохраняется скрытым (MODERATION)
        // и после коммита уходит на проверку ИИ — см. EventController#create
        moderationService.screen(event);

        Event saved = eventRepository.save(event);
        mapCacheInvalidator.mapDataChanged();
        return mapper.toDetails(saved, auth.id());
    }

    @Transactional
    public EventResponse complete(AuthUser auth, Long eventId) {
        Event event = eventRepository.requireForUpdate(eventId);
        if (!EventAccess.isManager(event, auth.id())) {
            throw ApiException.forbidden("Завершить мероприятие может только его создатель");
        }
        if (Instant.now().isBefore(event.getEndTime())) {
            throw ApiException.conflict("Завершить мероприятие можно только после времени окончания");
        }
        if (event.getStatus() == EventStatus.ARCHIVED) {
            throw ApiException.conflict("Мероприятие уже находится в архиве");
        }
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw ApiException.conflict("Снятое или отменённое мероприятие нельзя завершить");
        }
        event.setStatus(EventStatus.ARCHIVED);
        if (event.getRecurrenceRule() != RecurrenceRule.NONE) {
            Event next = eventRepository.save(Recurrence.nextOccurrence(event, Instant.now()));
            event.setNextOccurrenceId(next.getId());
        }
        mapCacheInvalidator.mapDataChanged();
        return mapper.toDetails(event, auth.id());
    }

    /**
     * От чьего имени публикуется мероприятие. Обычный пользователь — от своего имени,
     * организатор — от имени организации, но только после одобрения администратором.
     */
    private Organization resolveOrganization(User author) {
        if (Roles.ADMIN.equals(author.getRole())) {
            throw ApiException.forbidden("Администратор модерирует площадку и не создаёт мероприятия");
        }
        if (!Roles.ORGANIZER.equals(author.getRole())) {
            return null;
        }
        Organization org = organizationRepository.findFirstByOwnerIdOrderByIdAsc(author.getId())
                .orElseThrow(() -> ApiException.forbidden("За вашим аккаунтом не закреплена организация"));
        return switch (org.getStatus()) {
            case OrganizationStatus.APPROVED -> org;
            case OrganizationStatus.REJECTED -> throw ApiException.forbidden("Заявка организации отклонена"
                    + (org.getRejectReason() == null ? "" : ": " + org.getRejectReason()));
            default -> throw ApiException.forbidden(
                    "Организация ожидает одобрения администратора — публиковать мероприятия пока нельзя");
        };
    }

    private void validateSchedule(CreateEventRequest req) {
        Instant now = Instant.now();
        if (!req.startTime().isAfter(now)) {
            throw ApiException.badRequest("Начало мероприятия должно быть в будущем");
        }
        if (req.startTime().isAfter(now.plus(MAX_ADVANCE))) {
            throw ApiException.badRequest("Нельзя создавать мероприятия дальше чем на 2 года вперёд");
        }
        if (!req.endTime().isAfter(req.startTime())) {
            throw ApiException.badRequest("Окончание должно быть позже начала");
        }
        if (Duration.between(req.startTime(), req.endTime()).compareTo(MAX_DURATION) > 0) {
            throw ApiException.badRequest("Мероприятие не может длиться дольше 30 дней");
        }
        if (req.registrationDeadline() != null && req.registrationDeadline().isAfter(req.startTime())) {
            throw ApiException.badRequest("Приём заявок должен заканчиваться не позже начала мероприятия");
        }
    }

    private OrgDetails rejectOrgDetails(OrgDetails details) {
        if (details != null) {
            throw ApiException.badRequest("Блок «Данные организации» доступен только организациям");
        }
        return null;
    }

    /** Для организации обязательны контакты; остальные сведения очищаются и нормализуются. */
    private OrgDetails normalizeOrgDetails(OrgDetails d) {
        if (d == null || isBlank(d.contactName()) || (isBlank(d.contactPhone()) && isBlank(d.contactEmail()))) {
            throw ApiException.badRequest("Для мероприятия организации укажите контактное лицо и телефон или e-mail");
        }
        String website = Strings.blankToNull(d.website());
        if (website != null && !website.matches("(?i)^https?://\\S+$")) {
            throw ApiException.badRequest("Ссылка на регламент/сайт должна начинаться с http:// или https://");
        }
        String email = Strings.blankToNull(d.contactEmail());
        if (email != null && !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw ApiException.badRequest("Некорректный e-mail организатора");
        }
        List<ProgramItem> program = d.program() == null ? null : d.program().stream()
                .map(i -> new ProgramItem(Strings.blankToNull(i.time()), i.title().trim()))
                .toList();
        return new OrgDetails(
                d.contactName().trim(), Strings.blankToNull(d.contactPhone()), email, website, Strings.blankToNull(d.venueName()),
                cleanStrings(d.requiredDocuments()),
                Boolean.TRUE.equals(d.medicalCertificateRequired()), Boolean.TRUE.equals(d.insuranceRequired()),
                Strings.blankToNull(d.prizes()), program == null || program.isEmpty() ? null : program,
                cleanStrings(d.facilities()), Strings.blankToNull(d.cancellationPolicy()), Strings.blankToNull(d.sponsors()));
    }

    private List<CustomField> normalizeCustomFields(List<CustomField> fields) {
        if (fields == null) {
            return new ArrayList<>();
        }
        return fields.stream().map(f -> new CustomField(f.label().trim(), f.value().trim())).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }

    private static List<String> cleanStrings(List<String> values) {
        if (values == null) {
            return null;
        }
        List<String> cleaned = values.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    /** Событие в формате iCalendar для добавления в календарь телефона одним нажатием. */
    @Transactional(readOnly = true)
    public String ics(Long id) {
        return IcsWriter.write(eventRepository.requireDetailed(id), Instant.now());
    }
}
