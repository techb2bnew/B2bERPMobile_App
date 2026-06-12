import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import {
  PERSON_SUFFIX,
  PROJECT_OPEN_TASKS_SUFFIX,
  PROJECT_PEOPLE_SUFFIX,
  PROJECTS_SEARCH_PLACEHOLDER,
  PROJECTS_WORK_TITLE,
  PROJECTS_WORK_WORKSPACE,
  PROJECTS_WORK_SUBTITLE_SUFFIX,
} from '../../constants/Constants';
import {
  darkAccentGreenColor,
  darkBackgroundColor,
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { MAIN_ROUTES } from '../../navigation/routes';
import { syncSupabaseRealtimeAuth } from '../../lib/supabase';
import { fetchAllEmployeeProfiles } from '../../services/employeeService';
import {
  fetchOpenTaskCountsByProject,
  subscribeToAssigneeProjectTasksChanges,
} from '../../services/projectTasksService';
import {
  fetchProjectsForUser,
  subscribeToProjectsChanges,
} from '../../services/projectsService';
import {
  buildEmployeeNameMap,
  getMemberColor,
  getMemberInitial,
  getTeamMemberName,
} from '../../utils/projectUtils';
import { getFirstName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const BLUE = '#2D7DD2';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const LIVE_POLL_INTERVAL_MS = 5000;

const ProjectsWorkScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState([]);
  const [employeeNameMap, setEmployeeNameMap] = useState({});
  const [openTaskCounts, setOpenTaskCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const isFirstLoad = useRef(true);

  const displayName = getFirstName(user?.name || 'User');

  const loadProjects = useCallback(
    async ({ isRefresh = false, silent = false } = {}) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }

      if (!silent) {
        setError('');
      }

      try {
      const [data, employees, taskCounts] = await Promise.all([
        fetchProjectsForUser(user),
        fetchAllEmployeeProfiles(),
        user?.id ? fetchOpenTaskCountsByProject(user.id) : Promise.resolve({}),
      ]);
      setProjects(data);
      setEmployeeNameMap(buildEmployeeNameMap(employees));
      setOpenTaskCounts(taskCounts);
      } catch (loadError) {
        if (!silent) {
          setError(loadError?.message || 'Unable to load projects.');
          setProjects([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  const onRefresh = useCallback(() => {
    loadProjects({ isRefresh: true });
  }, [loadProjects]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const silent = !isFirstLoad.current;
      isFirstLoad.current = false;

      const refresh = () => {
        if (active) {
          loadProjects({ silent: true });
        }
      };

      loadProjects({ silent });
      syncSupabaseRealtimeAuth().catch(() => {});

      const pollTimer = setInterval(refresh, LIVE_POLL_INTERVAL_MS);

      return () => {
        active = false;
        clearInterval(pollTimer);
      };
    }, [loadProjects]),
  );

  useEffect(() => {
    const refresh = () => {
      loadProjects({ silent: true });
    };

    const unsubscribeProjects = subscribeToProjectsChanges(refresh);
    const unsubscribeTasks = user?.id
      ? subscribeToAssigneeProjectTasksChanges(user.id, refresh)
      : () => {};

    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, [loadProjects, user?.id]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects.filter(
      project =>
        project.name?.toLowerCase().includes(query) ||
        project.client?.toLowerCase().includes(query) ||
        project.status?.toLowerCase().includes(query),
    );
  }, [projects, search]);

  const openProject = project => {
    navigation.navigate(MAIN_ROUTES.TASK_MANAGEMENT, {
      projectId: project.id,
      projectName: project.name,
    });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={PROJECTS_WORK_TITLE} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={darkAccentGreenColor}
              colors={[darkAccentGreenColor]}
            />
          }>
          <View style={styles.workspaceRow}>
            <Icon name="folder" size={wp(4)} color={darkTextSecondaryColor} />
            <Text style={styles.workspaceLabel}>{PROJECTS_WORK_WORKSPACE}</Text>
          </View>

          <Text style={styles.heading}>{displayName}'s projects</Text>
          <Text style={styles.subtitle}>
            {projects.length} {PROJECTS_WORK_SUBTITLE_SUFFIX}
          </Text>

          <View style={styles.searchWrap}>
            <Icon name="search" size={wp(4.5)} color={darkTextSecondaryColor} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={PROJECTS_SEARCH_PLACEHOLDER}
              placeholderTextColor={darkPlaceholderColor}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={BLUE} style={styles.loader} />
          ) : error ? (
            <View style={styles.messageWrap}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={onRefresh} activeOpacity={0.8}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredProjects.length === 0 ? (
            <Text style={styles.emptyText}>No assigned projects found.</Text>
          ) : (
            <View style={styles.projectList}>
              {filteredProjects.map(project => {
                const team = Array.isArray(project.team) ? project.team : [];
                const openTasks = openTaskCounts[project.id] || 0;

                return (
                  <TouchableOpacity
                    key={project.id}
                    style={styles.projectCard}
                    onPress={() => openProject(project)}
                    activeOpacity={0.85}>
                    <View style={styles.cardTop}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{project.status || 'In Progress'}</Text>
                      </View>
                      <Icon name="star" size={wp(4.5)} color={darkTextSecondaryColor} />
                    </View>

                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectType}>{project.client}</Text>

                    {openTasks > 0 ? (
                      <Text style={styles.openTasks}>
                        {openTasks} {PROJECT_OPEN_TASKS_SUFFIX}
                        {openTasks > 1 ? 's' : ''}
                      </Text>
                    ) : null}

                    <View style={styles.cardFooter}>
                      <View style={styles.avatarRow}>
                        {team.slice(0, 4).map((member, index) => {
                          const memberLabel =
                            getTeamMemberName(member, employeeNameMap) || 'Member';

                          return (
                          <View
                            key={`${project.id}-${memberLabel}-${index}`}
                            style={[
                              styles.avatar,
                              { backgroundColor: getMemberColor(index) },
                              index > 0 && styles.avatarOverlap,
                            ]}>
                            <Text style={styles.avatarText}>{getMemberInitial(memberLabel)}</Text>
                          </View>
                          );
                        })}
                      </View>
                      <Text style={styles.memberCount}>
                        {team.length}{' '}
                        {team.length === 1 ? PERSON_SUFFIX : PROJECT_PEOPLE_SUFFIX}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <AiAssistant />
    </View>
  );
};

export default ProjectsWorkScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(1.2),
    paddingBottom: hp(14),
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1),
  },
  workspaceLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    letterSpacing: 1,
  },
  heading: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.5),
  },
  subtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(2),
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    marginBottom: hp(2.5),
    gap: wp(2.5),
  },
  searchInput: {
    flex: 1,
    paddingVertical: hp(1.2),
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  loader: {
    marginTop: hp(4),
  },
  messageWrap: {
    alignItems: 'center',
    paddingVertical: hp(4),
    gap: hp(1),
  },
  errorText: {
    ...style.fontSizeNormal,
    color: '#E85D5D',
    textAlign: 'center',
  },
  retryText: {
    ...style.fontSizeNormal,
    color: BLUE,
    ...style.fontWeightMedium,
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    paddingVertical: hp(4),
  },
  projectList: {
    gap: hp(1.5),
  },
  projectCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(2),
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  statusBadge: {
    backgroundColor: 'rgba(45, 125, 210, 0.15)',
    borderRadius: wp(2),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
  },
  statusText: {
    ...style.fontSizeSmall,
    color: BLUE,
    ...style.fontWeightMedium,
  },
  projectName: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.4),
  },
  projectType: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.8),
  },
  openTasks: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    marginBottom: hp(1.2),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.5),
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: darkSurfaceColor,
  },
  avatarOverlap: {
    marginLeft: -wp(2),
  },
  avatarText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  memberCount: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
});
