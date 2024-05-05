module Main exposing (main)

import Browser
import Browser.Events
import Browser.Navigation as Nav
import Html exposing (Html)
import Html.Attributes
import Html.Events
import Process
import Task
import Time
import Url exposing (Url)
import WebGLDemo


type Msg
    = UrlRequested Browser.UrlRequest
    | UrlChanged Url
    | IncrementClicked
    | DecrementClicked
    | TimePassed
    | AnimationFrame Time.Posix
    | SleepClicked
    | SleepDone


type alias Model =
    { key : Nav.Key
    , userModel : UserModel
    }


type alias UserModel =
    { urlPath : String
    , counter : Int
    , animationFrameTimeMillis : Int
    }


type alias Flags =
    { userModel : Maybe UserModel
    }


init : Flags -> Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url key =
    ( { key = key
      , userModel =
            flags.userModel
                |> Maybe.withDefault
                    { urlPath = url.path
                    , counter = 0
                    , animationFrameTimeMillis = 0
                    }
      }
    , Cmd.none
    )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg ({ userModel } as model) =
    case msg of
        UrlRequested urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Nav.load href )

        UrlChanged url ->
            ( { model | userModel = { userModel | urlPath = url.path } }
            , Cmd.none
            )

        IncrementClicked ->
            ( { model | userModel = { userModel | counter = userModel.counter + 1 } }, Cmd.none )

        DecrementClicked ->
            ( { model | userModel = { userModel | counter = userModel.counter - 1 } }, Cmd.none )

        TimePassed ->
            let
                _ =
                    Debug.log "Time.every 1000" ()
            in
            ( model, Cmd.none )

        AnimationFrame time ->
            ( { model | userModel = { userModel | animationFrameTimeMillis = Time.posixToMillis time } }, Cmd.none )

        SleepClicked ->
            ( model, Process.sleep 3000 |> Task.perform (always SleepDone) )

        SleepDone ->
            let
                _ =
                    Debug.log "Process.sleep 3000" ()
            in
            ( model, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ Time.every 1000 (always TimePassed)
        , Browser.Events.onAnimationFrame AnimationFrame
        ]


view : Model -> Browser.Document Msg
view { userModel } =
    { title = "Elm Reboot Demo"
    , body =
        [ section "Model state & event listeners"
            [ Html.p [] [ Html.text "Clicking the buttons should affect the counter when the app is running, and not throw errors when the app is killed." ]
            , Html.p [] [ Html.text "The counter should be preserved when remounting the app." ]
            , Html.button [ Html.Events.onClick DecrementClicked ] [ Html.text "-" ]
            , Html.text (" " ++ String.fromInt userModel.counter ++ " ")
            , Html.button [ Html.Events.onClick IncrementClicked ] [ Html.text "+" ]
            ]
        , section "DOM state"
            [ Html.p [] [ Html.text "The scroll position should be preserved when remounting the app." ]
            , Html.div
                [ Html.Attributes.style "height" "200px"
                , Html.Attributes.style "overflow" "auto"
                , Html.Attributes.style "border" "1px solid black"
                ]
                (Html.div [] [ Html.text "Scroll me!" ]
                    :: (List.range 1 100
                            |> List.map (\i -> Html.div [] [ Html.text (String.fromInt i) ])
                       )
                )
            ]
            -- This silly `Html.map` is here because out of the box, `Html.map` messes up Elm’s `_VirtualDom_virtualize`, causing the entire thing inside the `Html.map` to be re-created even though it is already the correct DOM.
            |> Html.map identity
        , section "WebGL"
            [ Html.p [] [ Html.text "The triangle should spin while the app is running, and stop where it was when killing it, without any errors in the console." ]
            , Html.p [] [ Html.text "When remounting, it should start spinning again." ]
            , WebGLDemo.view userModel.animationFrameTimeMillis
            ]
        , section "Links"
            [ Html.p [] [ Html.text "Clicking the links should update the current URL path below when the app is running (not do full page loads), and not throw errors when the app is killed." ]
            , Html.p [] [ Html.text "The current URL path should still be correct when remounting the app." ]
            , Html.p [] [ Html.text ("Current URL path: " ++ userModel.urlPath) ]
            , Html.div [] [ Html.a [ Html.Attributes.href "/" ] [ Html.text "/" ] ]
            , Html.div [] [ Html.a [ Html.Attributes.href "/one" ] [ Html.text "/one" ] ]
            , Html.div [] [ Html.a [ Html.Attributes.href "/two" ] [ Html.text "/two" ] ]
            ]
        , section "Browser back and forward buttons"
            [ Html.p [] [ Html.text "Use the links, then the back and forward buttons in your browser." ]
            , Html.p [] [ Html.text "That should update the current URL path when the app is running, and not throw errors when the app is killed." ]
            ]
        , section "Subscriptions"
            [ Html.p [] [ Html.text "Open the browser console. You should see a message every second when the app is running, and an error should not be thrown when the app is killed." ]
            ]
        , section "Long-running Cmd"
            [ Html.p [] [ Html.text "Clicking the button should result in a message in the browser console after 3 seconds when the app is running. If it is killed during those 3 seconds, no error should be thrown once the 3 seconds have passed." ]
            , Html.button [ Html.Events.onClick SleepClicked ] [ Html.text "Sleep 3 seconds" ]
            ]
        ]
    }


section : String -> List (Html msg) -> Html msg
section title elements =
    Html.section []
        [ Html.h2 [] [ Html.text title ]
        , Html.div [] elements
        ]


application =
    -- This is extracted since it’s possible to do so. The hot reload needs to handle that.
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    , onUrlRequest = UrlRequested
    , onUrlChange = UrlChanged
    }


main : Program Flags Model Msg
main =
    Browser.application application
