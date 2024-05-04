module Main exposing (main)

import Browser
import Browser.Navigation as Nav
import Html exposing (Html)
import Html.Attributes
import Html.Events
import Time
import Url exposing (Url)


type Msg
    = UrlRequested Browser.UrlRequest
    | UrlChanged Url
    | IncrementClicked
    | DecrementClicked
    | TimePassed


type alias Model =
    { key : Nav.Key
    , urlPath : String
    , counter : Int
    }


init : () -> Url -> Nav.Key -> ( Model, Cmd Msg )
init () url key =
    ( { key = key
      , urlPath = url.path
      , counter = 0
      }
    , Cmd.none
    )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        UrlRequested urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Nav.load href )

        UrlChanged url ->
            ( { model | urlPath = url.path }
            , Cmd.none
            )

        IncrementClicked ->
            ( { model | counter = model.counter + 1 }, Cmd.none )

        DecrementClicked ->
            ( { model | counter = model.counter - 1 }, Cmd.none )

        TimePassed ->
            let
                _ =
                    Debug.log "Time.every 1000" ()
            in
            ( model, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Time.every 1000 (always TimePassed)


view : Model -> Browser.Document Msg
view model =
    { title = "Elm Reboot Demo"
    , body =
        [ section "Model state & event listeners"
            [ Html.p [] [ Html.text "Clicking the buttons should affect the counter when the app is running, and not throw errors when the app is killed." ]
            , Html.p [] [ Html.text "The counter should be preserved when remounting the app." ]
            , Html.button [ Html.Events.onClick DecrementClicked ] [ Html.text "-" ]
            , Html.text (" " ++ String.fromInt model.counter ++ " ")
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
        , section "Links"
            [ Html.p [] [ Html.text "Clicking the links should update the current URL path below when the app is running, and not throw errors when the app is killed." ]
            , Html.p [] [ Html.text "The current URL path should still be correct when remounting the app." ]
            , Html.p [] [ Html.text ("Current URL path: " ++ model.urlPath) ]
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


main : Program () Model Msg
main =
    Browser.application application
