import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import {
  PERSON_SUFFIX,
  PROJECT_IN_PROGRESS,
  PROJECT_OPEN_TASKS_SUFFIX,
  PROJECT_PEOPLE_SUFFIX,
  PROJECTS_SEARCH_PLACEHOLDER,
  PROJECTS_WORK_TITLE,
  PROJECTS_WORK_WORKSPACE,
  PROJECTS_WORK_SUBTITLE_SUFFIX,
} from '../../constants/Constants';
import {
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
import { getFirstName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const BLUE = '#2D7DD2';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);

const PROJECTS = [
  {
    id: 'erp',
    name: 'Base2brand ERP',
    type: 'Internal',
    status: PROJECT_IN_PROGRESS,
    members: 1,
    openTasks: 0,
    memberInitials: ['S'],
    memberColors: [PURPLE],
  },
  {
    id: 'jdp',
    name: 'JDP',
    type: 'JDP',
    status: PROJECT_IN_PROGRESS,
    members: 3,
    openTasks: 1,
    memberInitials: ['S', 'D', 'G'],
    memberColors: [PURPLE, BLUE, '#E84393'],
  },
];

const ProjectsWorkScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const displayName = getFirstName(user?.name || 'User');

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return PROJECTS;
    }
    return PROJECTS.filter(
      project =>
        project.name.toLowerCase().includes(query) ||
        project.type.toLowerCase().includes(query),
    );
  }, [search]);

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
          showsVerticalScrollIndicator={false}>
          <View style={styles.workspaceRow}>
            <Icon name="folder" size={wp(4)} color={darkTextSecondaryColor} />
            <Text style={styles.workspaceLabel}>{PROJECTS_WORK_WORKSPACE}</Text>
          </View>

          <Text style={styles.heading}>{displayName}'s projects</Text>
          <Text style={styles.subtitle}>
            {PROJECTS.length} {PROJECTS_WORK_SUBTITLE_SUFFIX}
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

          <View style={styles.projectList}>
            {filteredProjects.map(project => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => openProject(project)}
                activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{project.status}</Text>
                  </View>
                  <Icon name="star" size={wp(4.5)} color={darkTextSecondaryColor} />
                </View>

                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectType}>{project.type}</Text>

                {project.openTasks > 0 ? (
                  <Text style={styles.openTasks}>
                    {project.openTasks} {PROJECT_OPEN_TASKS_SUFFIX}
                    {project.openTasks > 1 ? 's' : ''}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.avatarRow}>
                    {project.memberInitials.map((initial, index) => (
                      <View
                        key={`${project.id}-${initial}-${index}`}
                        style={[
                          styles.avatar,
                          { backgroundColor: project.memberColors[index] },
                          index > 0 && styles.avatarOverlap,
                        ]}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.memberCount}>
                    {project.members}{' '}
                    {project.members === 1 ? PERSON_SUFFIX : PROJECT_PEOPLE_SUFFIX}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
