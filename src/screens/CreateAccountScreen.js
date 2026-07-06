import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { LOGO_IMAGE } from '../assets/images';
import CommonButton from '../components/CommonButton';
import CommonTextInput from '../components/CommonTextInput';
import FormErrorBanner from '../components/FormErrorBanner';
import {
    darkAccentBlueColor,
    darkBackgroundColor,
    darkBorderColor,
    darkSurfaceColor,
    darkTextPrimaryColor,
    darkTextSecondaryColor,
} from '../constants/Color';
import {
    BACK_TO_LOGIN,
    CREATE_ACCOUNT_BUTTON,
    CREATE_ACCOUNT_SUCCESS_MESSAGE,
    CREATE_ACCOUNT_SUCCESS_TITLE,
    CREATE_PASSWORD_PLACEHOLDER,
    DEPARTMENT_LABEL,
    DEPARTMENT_PLACEHOLDER,
    EMPLOYEE_ID_LABEL,
    EMPLOYEE_ID_PLACEHOLDER,
    ERP_APP_NAME,
    FULL_NAME_LABEL,
    FULL_NAME_PLACEHOLDER,
    HAVE_ACCOUNT_TEXT,
    PASSWORD_LABEL,
    PHONE_NUMBER_LABEL,
    PHONE_NUMBER_PLACEHOLDER,
    REQUEST_ACCESS_SUBTITLE,
    REQUEST_ACCESS_TITLE,
    ROLE_DESIGNATION_LABEL,
    ROLE_DESIGNATION_PLACEHOLDER,
    SIGN_IN_LINK,
    WORK_EMAIL_LABEL,
    WORK_EMAIL_PLACEHOLDER,
    MAX_PHONE_LENGTH,
} from '../constants/Constants';
import { style, spacings } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { AUTH_ROUTES } from '../navigation/routes';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import { registerEmployee } from '../services/employeeService';
import { hasFormErrors, validateCreateAccountForm } from '../validation';

const INITIAL_ERRORS = {
    fullName: '',
    workEmail: '',
    phoneNumber: '',
    department: '',
    roleDesignation: '',
    password: '',
};

const CreateAccountScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const selectedRole = route.params?.selectedRole;

    const [fullName, setFullName] = useState('');
    const [workEmail, setWorkEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [department, setDepartment] = useState('');
    const [roleDesignation, setRoleDesignation] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState(INITIAL_ERRORS);
    const [submitError, setSubmitError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedRole) {
            navigation.replace(AUTH_ROUTES.ROLE_SELECTION);
        }
    }, [navigation, selectedRole]);

    useFocusEffect(
        useCallback(() => {
            setFullName('');
            setWorkEmail('');
            setPhoneNumber('');
            setDepartment('');
            setRoleDesignation(selectedRole?.title || '');
            setEmployeeId('');
            setPassword('');
            setErrors(INITIAL_ERRORS);
            setSubmitError('');
            setLoading(false);
        }, [selectedRole?.title]),
    );

    const clearFieldError = field => {
        setErrors(prev => ({ ...prev, [field]: '' }));
        setSubmitError('');
    };

    const handleSubmit = async () => {
        const formErrors = validateCreateAccountForm({
            fullName,
            workEmail,
            phoneNumber,
            department,
            roleDesignation,
            password,
        });
        setErrors(prev => ({ ...prev, ...formErrors }));

        if (hasFormErrors(formErrors)) {
            return;
        }

        setSubmitError('');
        setLoading(true);

        try {
            const response = await registerEmployee({
                workEmail,
                password,
                selectedRole,
                fullName,
                phoneNumber,
                department,
                roleDesignation,
                employeeId,
            });
            console.log('Register response:', response);

            Alert.alert(
                CREATE_ACCOUNT_SUCCESS_TITLE,
                CREATE_ACCOUNT_SUCCESS_MESSAGE,
                [
                    {
                        text: 'OK',
                        onPress: () =>
                            navigation.navigate(AUTH_ROUTES.LOGIN, { selectedRole }),
                    },
                ],
            );
        } catch (error) {
            console.log('Register error:', error);
            setSubmitError(
                error?.message || 'Unable to create account. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    };

    const goToLogin = () => {
        // navigation.navigate(AUTH_ROUTES.LOGIN, { selectedRole });
        navigation.goBack();
    };

    const goToRoles = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={goToRoles}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="arrow-left" size={wp(5)} color={darkTextPrimaryColor} />
                    <Text style={styles.backText}>{BACK_TO_LOGIN}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={BaseStyle.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Image
                            source={LOGO_IMAGE}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.appName}>{ERP_APP_NAME}</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.title}>{REQUEST_ACCESS_TITLE}</Text>
                        <Text style={styles.subtitle}>{REQUEST_ACCESS_SUBTITLE}</Text>

                        <CommonTextInput
                            label={FULL_NAME_LABEL}
                            required
                            value={fullName}
                            onChangeText={text => {
                                setFullName(text);
                                clearFieldError('fullName');
                            }}
                            placeholder={FULL_NAME_PLACEHOLDER}
                            autoCapitalize="words"
                            error={errors.fullName}
                        />

                        <CommonTextInput
                            label={WORK_EMAIL_LABEL}
                            required
                            value={workEmail}
                            onChangeText={text => {
                                setWorkEmail(text.toLowerCase());
                                clearFieldError('workEmail');
                            }}
                            placeholder={WORK_EMAIL_PLACEHOLDER}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            error={errors.workEmail}
                        />

                        <CommonTextInput
                            label={PHONE_NUMBER_LABEL}
                            required
                            value={phoneNumber}
                            onChangeText={text => {
                                setPhoneNumber(
                                    text.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH),
                                );
                                clearFieldError('phoneNumber');
                            }}
                            placeholder={PHONE_NUMBER_PLACEHOLDER}
                            keyboardType="phone-pad"
                            maxLength={MAX_PHONE_LENGTH}
                            error={errors.phoneNumber}
                        />

                        <View style={styles.inputRow}>
                            <CommonTextInput
                                label={DEPARTMENT_LABEL}
                                required
                                value={department}
                                onChangeText={text => {
                                    setDepartment(text);
                                    clearFieldError('department');
                                }}
                                placeholder={DEPARTMENT_PLACEHOLDER}
                                autoCapitalize="words"
                                error={errors.department}
                                containerStyle={styles.rowInput}
                            />
                            <CommonTextInput
                                label={EMPLOYEE_ID_LABEL}
                                value={employeeId}
                                onChangeText={setEmployeeId}
                                placeholder={EMPLOYEE_ID_PLACEHOLDER}
                                autoCapitalize="characters"
                                containerStyle={styles.rowInput}
                            />
                        </View>

                        <CommonTextInput
                            label={ROLE_DESIGNATION_LABEL}
                            required
                            value={roleDesignation}
                            onChangeText={text => {
                                setRoleDesignation(text);
                                clearFieldError('roleDesignation');
                            }}
                            placeholder={ROLE_DESIGNATION_PLACEHOLDER}
                            autoCapitalize="words"
                            error={errors.roleDesignation}
                        />

                        <CommonTextInput
                            label={PASSWORD_LABEL}
                            required
                            value={password}
                            onChangeText={text => {
                                setPassword(text);
                                clearFieldError('password');
                            }}
                            placeholder={CREATE_PASSWORD_PLACEHOLDER}
                            secureTextEntry
                            error={errors.password}
                        />

                        <FormErrorBanner message={submitError} />

                        <CommonButton
                            title={CREATE_ACCOUNT_BUTTON}
                            onPress={handleSubmit}
                            loading={loading}
                            style={styles.submitButton}
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{HAVE_ACCOUNT_TEXT}</Text>
                        <TouchableOpacity onPress={goToLogin}>
                            <Text style={styles.footerLink}>{SIGN_IN_LINK}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default CreateAccountScreen;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: darkBackgroundColor,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacings.large,
        paddingVertical: spacings.xLarge,
        borderBottomWidth: 1,
        borderBottomColor: darkBorderColor,
        backgroundColor: darkBackgroundColor,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacings.xsmall,
    },
    backText: {
        ...style.fontSizeNormal,
        ...style.fontWeightThin1x,
        color: darkTextPrimaryColor,
        marginLeft: spacings.normal,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: wp(6),
        paddingVertical: hp(2),
        paddingBottom: hp(4),
    },
    header: {
        alignItems: 'center',
        marginBottom: hp(2.5),
    },
    logoImage: {
        width: wp(55),
        height: hp(8),
        marginBottom: spacings.normal,
    },
    appName: {
        ...style.fontSizeSmall2x,
        ...style.fontWeightThin1x,
        color: darkTextSecondaryColor,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: darkSurfaceColor,
        borderRadius: wp(3.5),
        borderWidth: 1,
        borderColor: darkBorderColor,
        paddingHorizontal: wp(5),
        paddingVertical: hp(3),
    },
    title: {
        ...style.fontSizeLargeXX,
        ...style.fontWeightMedium1x,
        color: darkTextPrimaryColor,
        marginBottom: spacings.small,
    },
    subtitle: {
        ...style.fontSizeNormal,
        ...style.fontWeightThin,
        color: darkTextSecondaryColor,
        marginBottom: spacings.xLarge,
        lineHeight: hp(2.8),
    },
    inputRow: {
        flexDirection: 'row',
        gap: wp(3),
    },
    rowInput: {
        flex: 1,
    },
    submitButton: {
        marginTop: spacings.normal,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: hp(3),
    },
    footerText: {
        ...style.fontSizeSmall2x,
        color: darkTextSecondaryColor,
    },
    footerLink: {
        ...style.fontSizeSmall2x,
        ...style.fontWeightMedium,
        color: darkAccentBlueColor,
    },
});
